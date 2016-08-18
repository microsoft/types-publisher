import * as child_process from "child_process";
import * as fs from "fs";
import * as https from "https";
import * as yargs from "yargs";
import { AnyPackage, existsTypesDataFileSync, fullPackageName, readAllPackages } from "./lib/common";
import { LogWithErrors, logger, writeLog } from "./lib/logging";
import NpmClient from "./lib/npm-client";
import * as publisher from "./lib/package-publisher";
import { done, filterAsyncOrdered, nAtATime, streamPromise, unGzip } from "./lib/util";

if (!module.parent) {
	if (!existsTypesDataFileSync() || !fs.existsSync("./output") || fs.readdirSync("./output").length === 0) {
		console.log("Run parse-definitions and generate-packages first!");
	}
	else {
		const dry = !!yargs.argv.dry;
		const fix = !!yargs.argv.fix;
		const singleName = yargs.argv.single;
		// For testing only. Do not use on real @types repo.
		const shouldUnpublish = !!yargs.argv.unpublish;

		if (fix + singleName + shouldUnpublish > 1) {
			throw new Error("Select only one of --fix or -single=foo or --shouldUnpublish");
		}

		done(go());

		async function go(): Promise<void> {
			if (shouldUnpublish) {
				await unpublish(dry);
			}
			else {
				const client = await NpmClient.create();
				if (fix) {
					await republishToFixNotGzipped(client, dry);
				}
				else if (singleName) {
					await single(client, singleName, dry);
				}
				else {
					await main(client, dry);
				}
			}
		}
	}
}

export default async function main(client: NpmClient, dry: boolean): Promise<void> {
	const [log, logResult] = logger();
	if (dry) {
		log("=== DRY RUN ===");
	}

	const packagesShouldPublish: AnyPackage[] = [];

	log("Checking which packages we should publish");
	await nAtATime(100, await readAllPackages(), async pkg => {
		const [shouldPublish, checkLog] = await publisher.shouldPublish(pkg);

		if (shouldPublish) {
			packagesShouldPublish.push(pkg);
		}

		log(`Checking ${pkg.libraryName}...`);
		writeLogs(checkLog);
	});

	packagesShouldPublish.sort((pkgA, pkgB) => pkgA.libraryName.localeCompare(pkgB.libraryName));

	for (const pkg of packagesShouldPublish) {
		console.log(`Publishing ${pkg.libraryName}...`);
		const publishLog = await publisher.publishPackage(client, pkg, dry);
		writeLogs({ infos: publishLog, errors: [] });
	}

	function writeLogs(res: LogWithErrors): void {
		for (const line of res.infos) {
			log(`   * ${line}`);
		}
		for (const err of res.errors) {
			log(`   * ERROR: ${err}`);
		}
	}

	await writeLog("publishing.md", logResult());
	console.log("Done!");
}

async function single(client: NpmClient, name: string, dry: boolean): Promise<void> {
	const pkg = (await readAllPackages()).find(p => p.typingsPackageName === name);
	if (pkg === undefined) {
		throw new Error(`Can't find a package named ${name}`);
	}

	const publishLog = await publisher.publishPackage(client, pkg, dry);

	console.log(publishLog);
}

async function unpublish(dry: boolean): Promise<void> {
	for (const pkg of await readAllPackages()) {
		await publisher.unpublishPackage(pkg, dry);
	}
}

async function republishToFixNotGzipped(client: NpmClient, dry: boolean): Promise<void> {
	for (const pkg of await readAllPackages()) {
		const name = pkg.typingsPackageName;
		if (await isGzipped(name)) {
			console.log(`${name} is OK`);
		}
		else {
			console.log(`${name} needs republish`);
			const publishLog = await publisher.publishPackage(client, pkg, dry);
			for (const log of publishLog) {
				console.log(log);
			}
		}
	}
}

async function isGzipped(packageName: string): Promise<boolean> {
	const {shasum, tarball} = await fetchInfo(packageName);
	const tgz = await fetchStream(tarball);
	const unGzipper = unGzip(tgz);
	unGzipper.on("data", (chunk: any) => {
		(<any> tgz).destroy();
	});
	try {
		await streamPromise(unGzipper);
		return true;
	}
	catch (error) {
		// If there's an error when trying to unzip it, that's probably because it wasn't zipped in the first place.
		return false;
	}
}

function fetchStream(url: string): Promise<NodeJS.ReadableStream> {
	return new Promise(resolve => {
		https.get(url, resolve);
	});
}

interface Info {
	shasum: string;
	tarball: string;
}

async function fetchInfo(packageName: string): Promise<Info> {
	return new Promise<Info>((resolve, reject) => {
		child_process.exec(`npm info ${fullPackageName(packageName)}`, { encoding: "utf8" }, (err, stdout) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(getDistSectionOfNpmInfo(stdout));
			}
		});
	});
}

function getDistSectionOfNpmInfo(info: string): Info {
	const match = /\{ shasum: '(\w+)',\s*tarball: '([^']+)' \}/m.exec(info);
	const [shasum, tarball] = match.slice(1);
	return {shasum, tarball};
}
