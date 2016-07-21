import * as yargs from "yargs";
import { AnyPackage, existsTypesDataFile, readNotNeededPackages, readTypings, writeDataFile } from "./lib/common";
import { done, nAtATime } from "./lib/util";
import { createSearchRecord, SearchRecord } from "./lib/search-index-generator";

if (!module.parent) {
	if (!existsTypesDataFile()) {
		console.log("Run parse-definitions first!");
	} else {
		const skipDownloads = yargs.argv.skipDownloads;
		const full = yargs.argv.full;
		done(main(skipDownloads, full));
	}
}

export default async function main(skipDownloads: boolean, full: boolean): Promise<void> {
	let packages = (readTypings() as AnyPackage[]).concat(readNotNeededPackages());
	console.log(`Loaded ${packages.length} entries`);

	const records = await nAtATime(100, packages, pkg => createSearchRecord(pkg, skipDownloads));
	// Most downloads first
	records.sort((a, b) => b.d - a.d);

	console.log(`Done generating search index`);

	console.log(`Writing out data files`);
	writeDataFile("search-index-min.json", records, false);
	if (full) {
		writeDataFile("search-index-full.json", records.map(verboseRecord), true);
	}
}

function verboseRecord(r: SearchRecord): {} {
	return renameProperties(r, {
		t: "typePackageName",
		g: "globals",
		m: "declaredExternalModules",
		p: "projectName",
		l: "libraryName",
		d: "downloads",
		r: "redirect"
	});
}

function renameProperties(obj: {}, replacers: { [name: string]: string }): {} {
	const out: any = {};
	for (const key of Object.getOwnPropertyNames(obj)) {
		out[replacers[key]] = (<any> obj)[key];
	}
	return out;
}
