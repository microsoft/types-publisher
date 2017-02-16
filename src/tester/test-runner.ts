import * as fsp from "fs-promise";
import * as yargs from "yargs";

import { Options } from "../lib/common";
import { AllPackages, PackageBase, TypeScriptVersion, TypingsData } from "../lib/packages";
import { LoggerWithErrors, moveLogsWithErrors, quietLoggerWithErrors } from "../util/logging";
import { done, exec, execAndThrowErrors, joinPaths, nAtATime, numberOfOsProcesses } from "../util/util";

import getAffectedPackages, { allDependencies } from "./get-affected-packages";
import { installAllTypeScriptVersions, pathToDtslint, pathToTsc } from "./ts-installer";

if (!module.parent) {
	const regexp = yargs.argv.all ? new RegExp("") : yargs.argv._[0] && new RegExp(yargs.argv._[0]);
	done(main(testerOptions(!!yargs.argv.runFromDefinitelyTyped), parseNProcesses(), regexp));
}

export function parseNProcesses(): number | undefined {
	const str = yargs.argv.nProcesses;
	if (!str) {
		return undefined;
	}
	const nProcesses = Number.parseInt(yargs.argv.nProcesses, 10);
	if (Number.isNaN(nProcesses)) {
		throw new Error("Expected nProcesses to be a number.");
	}
	return nProcesses;
}

export function testerOptions(runFromDefinitelyTyped: boolean): Options {
	if (runFromDefinitelyTyped) {
		return { definitelyTypedPath: process.cwd(), progress: false };
	} else {
		return Options.defaults;
	}
}

export default async function main(options: Options, nProcesses?: number, regexp?: RegExp): Promise<void> {
	//await installAllTypeScriptVersions();

	const allPackages = await AllPackages.read(options);
	const typings: TypingsData[] = regexp
		? allPackages.allTypings().filter(t => regexp.test(t.name))
		: await getAffectedPackages(allPackages, console.log, options);

	nProcesses = nProcesses || numberOfOsProcesses;

	console.log(`Testing ${typings.length} packages: ${typings.map(t => t.desc)}`);
	console.log(`Running with ${nProcesses} processes.`);

	const allErrors: Array<{ pkg: TypingsData, err: TesterError }> = [];

	console.log("Installing dependencies...");

	await nAtATime(nProcesses, allDependencies(allPackages, typings), async pkg => {
		const cwd = pkg.directoryPath(options);
		if (await fsp.exists(joinPaths(cwd, "package.json"))) {
			let stdout = await execAndThrowErrors(`npm install`, cwd);
			stdout = stdout.replace(/npm WARN \S+ No (description|repository field\.|license field\.)\n?/g, "");
			if (stdout) {
				console.log(stdout);
			}
		}
	});

	console.log("Testing...");

	await nAtATime(nProcesses, typings, async pkg => {
		const [log, logResult] = quietLoggerWithErrors();
		const err = await single(pkg, log, options);
		console.log(`Testing ${pkg.desc}`);
		moveLogsWithErrors(console, logResult(), msg => "\t" + msg);
		if (err) {
			allErrors.push({ err, pkg });
		}
	});

	if (allErrors.length) {
		allErrors.sort(({ pkg: pkgA }, { pkg: pkgB}) => PackageBase.compare(pkgA, pkgB));

		console.log("\n\n=== ERRORS ===\n");
		for (const { err, pkg } of allErrors) {
			console.error(`\n\nError in ${pkg.desc}`);
			console.error(err.message);
		}

		console.error(`The following packages had errors: ${allErrors.map(e => e.pkg.name).join(", ")}`);

		throw new Error("There was a test failure.");
	}
}

async function single(pkg: TypingsData, log: LoggerWithErrors, options: Options): Promise<TesterError | undefined> {
	const cwd = pkg.directoryPath(options);
	const error = await test(pkg.typeScriptVersion);
	if (error && pkg.typeScriptVersion !== TypeScriptVersion.Latest) {
		const newError = await test(TypeScriptVersion.Latest);
		if (!newError) {
			const message = `${error.message}\n` +
				`Package compiles in TypeScript ${TypeScriptVersion.Latest} but not in ${pkg.typeScriptVersion}.\n` +
				`You can add a line '// TypeScript Version: ${TypeScriptVersion.Latest}' to the end of the header to specify a new compiler version.`;
			return { message };
		}
	}
	return error;

	async function test(version: TypeScriptVersion): Promise<TesterError | undefined> {
		if (await fsp.exists(joinPaths(cwd, "tslint.json"))) {
			return runCommand(log, cwd, pathToDtslint(version), "--dt");
		} else {
			return runCommand(log, cwd, pathToTsc(version));
		}
	}
}

interface TesterError {
	message: string;
}

async function runCommand(log: LoggerWithErrors, cwd: string | undefined, cmd: string, ...args: string[]): Promise<TesterError | undefined> {
	const nodeCmd = `node ${cmd} ${args.join(" ")}`;
	log.info(`Running: ${nodeCmd}`);
	try {
		const { error, stdout, stderr } = await exec(nodeCmd, cwd);
		if (stdout) {
			log.info(stdout);
		}
		if (stderr) {
			log.error(stderr);
		}

		return error && { message: `${error.message}\n${stdout}\n${stderr}` };
	} catch (e) {
		return e;
	}
}
