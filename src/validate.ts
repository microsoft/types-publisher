import * as assert from "assert";
import * as fs from "fs";
import * as fsp from "fs-promise";
import * as path from "path";
import * as child_process from "child_process";
import * as rimraf from "rimraf";
import { Logger, ArrayLog, settings, writeLogSync, readTypings } from "./lib/common";

if (!module.parent) {
	main();
}

export default async function main() {
	const log = new ArrayLog();

	const packageNames = readTypings().map(t => t.typingsPackageName).sort();
	await validatePackages(packageNames, settings.validateOutputPath, log);

	const {infos, errors} = log.result();
	assert(!errors.length);
	writeLogSync("validate.md", infos);
}

export async function validatePackages(packageNames: string[], outPath: string, log: Logger) {
	log.info("");
	log.info("Using output path: " + outPath);
	log.info("Running tests....");
	log.info("");
	const failed: string[] = [];
	const passed: string[] = [];
	try {
		// Refresh the output folder
		if (await fsp.exists(outPath)) {
			await deleteDirectory(outPath, log);
		}
		await fsp.mkdirp(outPath);
	}
	catch (e) {
		log.error("Could not recreate output directory. " + e);
		return;
	}
	// Run the tests
	for (const packageName of packageNames) {
		if (await validatePackage(packageName, outPath, log)) {
			passed.push(packageName);
		}
		else {
			failed.push(packageName);
		}
	}

	// Write results
	log.info("");
	log.info("");
	log.info(`Total  ${packageNames.length}`);
	log.info(`Passed ${passed.length}`);
	log.info(`Failed ${failed.length}`);
}

async function validatePackage(packageName: string, outputDirecory: string, log: Logger) {
	let passed = false;
	try {
		const packageDirectory = path.join(outputDirecory, packageName);
		log.info("");
		log.info("Processing `" + packageName + "`...");
		await fsp.mkdirp(packageDirectory);
		await writePackage(packageDirectory, packageName);
		if (await runCommand("npm", log, packageDirectory, "npm install") &&
			await runCommand("tsc", log, packageDirectory, "tsc")) {
			await deleteDirectory(packageDirectory, log);
			log.info("Passed.");
			passed = true;
		}
	}
	catch (e) {
		log.info("Error: " + e);
		log.info("Failed!");
	}
	console.info(`${packageName} -- ${passed ? "Passed" : "Failed"}.`);
	return passed;
}

async function writePackage(packageDirectory: string, packageName: string) {
	// Write package.json
	await fsp.writeFile(path.join(packageDirectory, "package.json"), JSON.stringify({
		"name": `${packageName}test`,
		"version": "1.0.0",
		"description": "test",
		"author": "",
		"license": "ISC",
		"repository": "https://github.com/Microsoft/types-publisher",
		"dependencies": { [`@types/${packageName}`]: "latest" }
	}, undefined, 4), { encoding: "utf8" });

	// Write tsconfig.json
	await fsp.writeFile(path.join(packageDirectory, "tsconfig.json"), JSON.stringify({
		"compilerOptions": {
			"module": "commonjs",
			"target": "es5",
			"noImplicitAny": false,
			"strictNullChecks": false,
			"noEmit": true,
			"lib": ["es5", "es2015.promise", "dom"]
		}
	}, undefined, 4), { encoding: "utf8" });

	// Write index.ts
	await fsp.writeFile(path.join(packageDirectory, "index.ts"), `/// <reference types="${packageName}" />\r\n`, { encoding: "utf8" });
}

// Returns whether the command succeeded.
function runCommand(commandDescription: string, log: Logger, directory: string, ...args: string[]): Promise<boolean> {
	const cmd = args.join(" ");
	log.info(`Run ${cmd}`);
	return new Promise<boolean>((resolve, reject) => {
		child_process.exec(cmd, { encoding: "utf8", cwd: directory }, (err, stdoutBuffer, stderrBuffer) => {
			// These are wrongly typed as Buffer.
			const stdout = <string><any>stdoutBuffer;
			const stderr = <string><any>stderrBuffer;
			if (err) {
				log.error(stderr);
				log.info(stdout);
				log.error(`${commandDescription} failed: ${JSON.stringify(err)}`);
				log.info(`${commandDescription} failed, refer to error log`);
				resolve(false);
			}
			else {
				log.info(stdout);
				resolve(true);
			}
		});
	});
}

function deleteDirectory(path: string, log: Logger): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		rimraf(path, (err) => {
			if (err) {
				log.error(`rimraf failed: ${JSON.stringify(err)}`);
				log.info(`rimraf failed, refer to error log`);
				resolve(false);
			}
			else {
				resolve(true);
			}
		});
	});
}