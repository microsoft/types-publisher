/*
Usage:

	npm run build
	npm run clean
	npm run get-definitely-typed
	npm run parse
	npm run calculate-versions
	node ./bin/check-npm-website.js
*/

import fetch = require("node-fetch");
import { TypingsData, fullPackageName, readTypesDataFile, typingsFromData } from "./lib/common";
import { done, nAtATime } from "./lib/util";
import Versions, { changedPackages } from "./lib/versions";

if (!module.parent) {
	done(main());
}

/**
 * Downloads package packages from npmjs.com and checks that it reflects the latest published version.
 */
async function main(): Promise<void> {
	const [typeData, versions] = await Promise.all([readTypesDataFile(), Versions.load()]);
	const typings = typingsFromData(typeData);
	const changed = await changedPackages(typings);
	const outdated: TypingsData[] = [];

	await nAtATime(25, typings, async typing => {
		if (!changed.includes(typing)) {
			if (!await checkSingle(typing, versions.versionInfo(typing).version)) {
				outdated.push(typing);
			}
		}
	});

	console.log(`The following are outdated: ${outdated.map(t => t.typingsPackageName)}`);
}

/** Returns true if npm is up-to-date. */
async function checkSingle(typing: TypingsData, correctVersion: number): Promise<boolean> {
	const name = typing.typingsPackageName;
	const url = `https://www.npmjs.com/package/${fullPackageName(name)}`;
	console.log(`Checking ${name}...`);
	const content = await fetchTextWithRetries(url);

	const rgx = /<strong>\d+\.\d+\.(\d+)<\/strong>\s+is the latest/;
	const match = rgx.exec(content);
	if (match === null) {
		throw new Error(`${name} has unexpected content:\n${content}`);
	}

	const websiteVersion = match[1];
	const upToDate = websiteVersion === correctVersion.toString();
	if (!upToDate) {
		console.log(`OUTDATED: ${name}: Expected ${correctVersion}, got ${websiteVersion}`);
	}
	return upToDate;
}

async function fetchTextWithRetries(url: string, retries: number = 5): Promise<string> {
	while (retries > 0) {
		const response = await fetch(url);
		// Gateway Time-out
		if (response.status !== 200) {
			console.log(`Retrying ${url}...`);
			retries--;
		}
		else {
			return response.text();
		}
	}
	throw new Error(`Can't fetch ${url} even after retrying`);
}
