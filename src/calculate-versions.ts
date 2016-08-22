import * as child_process from "child_process";
import * as yargs from "yargs";
import { existsTypesDataFileSync, fullPackageName, readTypings } from "./lib/common";
import Versions, { Changes, writeChanges } from "./lib/versions";
import { done } from "./lib/util";

if (!module.parent) {
	if (!existsTypesDataFileSync()) {
		console.log("Run parse-definitions first!");
	} else {
		const forceUpdate = yargs.argv.forceUpdate;
		//done(main(forceUpdate));
		done(fixNotReadme());
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

export async function fixNotReadme() {
	const versions = await Versions.loadFromBlob();
	const changes: Changes = [];

	for (const typing of await readTypings()) {
		console.log(typing.typingsPackageName);
		if (!(await hasReadme(typing.typingsPackageName))) {
			versions.recordUpdate(typing, /*forceUpdate*/true);
			console.log(`Force update of ${typing.typingsPackageName}, which has no README`);
		}
	}

	await versions.saveLocally();
	await writeChanges(changes);
}

async function hasReadme(packageName: string): Promise<boolean> {
	return (await fetchReadme(packageName)).trim().length > 0;
}

async function fetchReadme(packageName: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		child_process.exec(`npm info ${fullPackageName(packageName)} readme`, { encoding: "utf8" }, (err, stdout) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(stdout);
			}
		});
	});
}
