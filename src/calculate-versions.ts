import * as child_process from "child_process";
import * as https from "https";
import * as yargs from "yargs";
import { existsTypesDataFileSync, fullPackageName, readTypings } from "./lib/common";
import Versions, { Changes, writeChanges } from "./lib/versions";
import { done, streamPromise, unGzip } from "./lib/util";

if (!module.parent) {
	if (!existsTypesDataFileSync()) {
		console.log("Run parse-definitions first!");
	} else {
		const forceUpdate = yargs.argv.forceUpdate;
		//done(main(forceUpdate));
		done(fixNotGzipped());
	}
}

export default async function main(forceUpdate: boolean): Promise<void> {
	console.log("\n## Calculating versions\n");
	const versions = await Versions.loadFromBlob();
	const changes: Changes = [];
	for (const typing of await readTypings()) {
		if (versions.recordUpdate(typing, forceUpdate)) {
			console.log(`Changed: ${typing.typingsPackageName}`);
			changes.push(typing.typingsPackageName);
		}
	}
	await versions.saveLocally();
	await writeChanges(changes);
}

async function fixNotGzipped() {
	const versions = await Versions.loadFromBlob();
	const changes: Changes = [];

	for (const typing of await readTypings()) {
		console.log(typing.typingsPackageName);
		if (!(await isGzipped(typing.typingsPackageName))) {
			versions.recordUpdate(typing, /*forceUpdate*/true);
			console.log(`Force update of ${typing.typingsPackageName}, not gzipped`);
			changes.push(typing.typingsPackageName);
		}
	}

	await versions.saveLocally();
	await writeChanges(changes);
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
