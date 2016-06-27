import { AnyPackage, Logger, LogResult, ArrayLog, fullPackageName, isNotNeededPackage, getOutputPath, notNeededReadme, settings } from "./common";
import * as common from "./common";
import { parseJson } from "./util";
import fetch = require("node-fetch");
import fsp = require("fs-promise");
import * as path from "path";
import * as child_process from "child_process";

export async function publishPackage(pkg: AnyPackage, dry: boolean): Promise<LogResult> {
	const {libraryName, typingsPackageName} = pkg;
	const log = new ArrayLog();

	const outputPath = getOutputPath(pkg);

	log.info(`Possibly publishing ${libraryName}`);

	// Read package.json for version number we would be publishing
	const packageJson = await fsp.readFile(path.join(outputPath, "package.json"), { encoding: "utf8" });
	const localVersion: string = parseJson(packageJson).version;
	log.info(`Local version from package.json is ${localVersion}`);

	const shouldUpdate = await shouldUpdateNpmPackage(log, pkg, localVersion);
	if (shouldUpdate) {
		const args: string[] = ["npm", "publish", path.resolve(outputPath), "--access public"];
		if (settings.tag) {
			args.push(`--tag ${settings.tag}`);
		}

		if (await runCommand("Publish", log, dry, args)) {
			if (isNotNeededPackage(pkg)) {
				const message = notNeededReadme(pkg);
				const args = ["npm", "deprecate", fullPackageName(typingsPackageName), JSON.stringify(message)];
				await runCommand("Deprecate", log, dry, args);
			}
		}
	}

	return log.result();
}

// Used for testing only.
export async function unpublishPackage(pkg: AnyPackage, dry: boolean): Promise<void> {
	const name = common.fullPackageName(pkg.typingsPackageName);
	const args: string[] = ["npm", "unpublish", name, "--force"];
	const log: Logger = { info: console.log, error: console.error };
	await runCommand("Unpublish", log, dry, args);
}

// Returns whether the command succeeded.
function runCommand(commandDescription: string, log: Logger, dry: boolean, args: string[]): Promise<boolean> {
	const cmd = args.join(" ");
	log.info(`Run ${cmd}`);
	if (!dry) {
		return new Promise((resolve, reject) => {
			child_process.exec(cmd, { encoding: "utf8" }, (err, stdoutBuffer, stderrBuffer) => {
				// These are wrongly typed as Buffer.
				const stdout = <string> <any> stdoutBuffer;
				const stderr = <string> <any> stderrBuffer;
				if (err) {
					log.error(`${commandDescription} failed: ${JSON.stringify(err)}`);
					log.info(`${commandDescription} failed, refer to error log`);
					log.error(<string> <any> stderr);
					resolve(false);
				}
				else {
					log.info("Ran successfully");
					log.info(<string> <any> stdout);
					resolve(true);
				}
			});
		});
	} else {
		log.info("(dry run)");
	}
}

async function shouldUpdateNpmPackage(log: Logger, {typingsPackageName}: AnyPackage, localVersion: string): Promise<boolean> {
	// Hit e.g. http://registry.npmjs.org/@ryancavanaugh%2fjquery for version data
	const fullName = common.fullPackageName(typingsPackageName);
	const registryUrl = `https://registry.npmjs.org/${fullName.replace("/", "%2F")}`;
	log.info(`Fetch registry data from ${registryUrl}`);

	// See if this version already exists

	let bodyString: string;
	try {
		bodyString = await (await fetch(registryUrl)).text();
	} catch (err) {
		log.error(JSON.stringify(err));
		return false;
	}

	interface NpmRegistryResult {
		versions: {
			[key: string]: {};
		};
		error: string;
	}

	const body: NpmRegistryResult = parseJson(bodyString);

	if (body.error === "Not found") {
		// OK, just haven't published this one before
		log.info("Registry indicates this is a new package");
		return true;
	}
	else if (body.error) {
		// Critical failure
		log.info("Unexpected response, refer to error log");
		log.error(`NPM registry failure for ${registryUrl}: Unexpected error content ${body.error})`);
		return false;
	}
	else {
		const remoteVersionExists = body.versions && body.versions[localVersion] !== undefined;
		log.info(remoteVersionExists ? "Remote version already exists" : "Remote version does not exist");
		return !remoteVersionExists;
	}
}
