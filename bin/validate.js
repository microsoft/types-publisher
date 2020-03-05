"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const packages_1 = require("./lib/packages");
const settings_1 = require("./lib/settings");
const versions_1 = require("./lib/versions");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const all = !!yargs.argv.all;
    const packageNames = yargs.argv._;
    if (all && packageNames.length) {
        throw new Error("Can't combine --all with listed package names.");
    }
    if (all) {
        console.log("Validating all packages");
        util_1.logUncaughtErrors(doAll());
    }
    else if (packageNames.length) {
        console.log(`Validating: ${JSON.stringify(packageNames)}`);
        util_1.logUncaughtErrors(doValidate(packageNames));
    }
    else {
        const log = logging_1.loggerWithErrors()[0];
        util_1.logUncaughtErrors(get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, log).then(validate));
    }
}
async function validate(dt) {
    await doValidate((await versions_1.readChangedPackages(await packages_1.AllPackages.read(dt))).changedTypings.map(c => c.pkg.name));
}
exports.default = validate;
async function doAll() {
    // todo: validate older versions too
    const packageNames = (await packages_1.AllPackages.readTypings()).map(t => t.name).sort();
    await doValidate(packageNames);
}
async function doValidate(packageNames) {
    const [log, logResult] = logging_1.loggerWithErrors();
    await validatePackages(packageNames, settings_1.validateOutputPath, log);
    const { infos, errors } = logResult();
    await Promise.all([
        logging_1.writeLog("validate.md", infos),
        logging_1.writeLog("validate-errors.md", errors),
    ]);
}
async function validatePackages(packageNames, outPath, log) {
    log.info("");
    log.info(`Using output path: ${outPath}`);
    log.info("Running tests....");
    log.info("");
    const failed = [];
    const passed = [];
    try {
        await fs_extra_1.remove(outPath);
        await fs_extra_1.mkdirp(outPath);
    }
    catch (e) {
        log.error(`Could not recreate output directory. ${e}`);
        return;
    }
    // Run the tests
    await util_1.nAtATime(25, packageNames, async (packageName) => {
        if (await validatePackage(packageName, outPath, log)) {
            passed.push(packageName);
        }
        else {
            failed.push(packageName);
        }
    });
    // Write results
    log.info("");
    log.info("");
    log.info(`Total  ${packageNames.length}`);
    log.info(`Passed ${passed.length}`);
    log.info(`Failed ${failed.length}`);
    log.info("");
    if (failed.length) {
        log.info(`These packages failed: ${failed.toString()}`);
    }
}
async function validatePackage(packageName, outputDirecory, mainLog) {
    const [log, logResult] = logging_1.quietLoggerWithErrors();
    let passed = false;
    try {
        const packageDirectory = util_1.joinPaths(outputDirecory, packageName);
        log.info("");
        log.info(`Processing \`${packageName}\`...`);
        await fs_extra_1.mkdirp(packageDirectory);
        await writePackage(packageDirectory, packageName);
        if (await runCommand("npm", log, packageDirectory, "../../node_modules/npm/bin/npm-cli.js", "install") &&
            await runCommand("tsc", log, packageDirectory, "../../node_modules/typescript/lib/tsc.js")) {
            await fs_extra_1.remove(packageDirectory);
            log.info("Passed.");
            passed = true;
        }
    }
    catch (e) {
        log.info(`Error: ${e}`);
        log.info("Failed!");
    }
    // Write the log as one entry to the main log
    logging_1.moveLogsWithErrors(mainLog, logResult());
    console.info(`${packageName} -- ${passed ? "Passed" : "Failed"}.`);
    return passed;
}
async function writePackage(packageDirectory, packageName) {
    // Write package.json
    await io_1.writeJson(util_1.joinPaths(packageDirectory, "package.json"), {
        name: `${packageName}_test`,
        version: "1.0.0",
        description: "test",
        author: "",
        license: "ISC",
        repository: "https://github.com/Microsoft/types-publisher",
        dependencies: { [packages_1.getFullNpmName(packageName)]: "latest" },
    });
    // Write tsconfig.json
    await io_1.writeJson(util_1.joinPaths(packageDirectory, "tsconfig.json"), {
        compilerOptions: {
            module: "commonjs",
            target: "es5",
            noImplicitAny: false,
            strictNullChecks: false,
            noEmit: true,
            lib: ["es5", "es2015.promise", "dom"],
        },
    });
    // Write index.ts
    await io_1.writeFile(util_1.joinPaths(packageDirectory, "index.ts"), `/// <reference types="${packageName}" />\r\n`);
}
// Returns whether the command succeeded.
async function runCommand(commandDescription, log, directory, cmd, ...args) {
    const nodeCmd = `node ${cmd} ${args.join(" ")}`;
    log.info(`Run ${nodeCmd}`);
    const { error, stdout, stderr } = await util_1.exec(nodeCmd, directory);
    if (error) {
        log.error(stderr);
        log.info(stdout);
        log.error(`${commandDescription} failed: ${JSON.stringify(error)}`);
        log.info(`${commandDescription} failed, refer to error log`);
        return false;
    }
    log.info(stdout);
    return true;
}
//# sourceMappingURL=validate.js.map