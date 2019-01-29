"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const fold = require("travis-fold");
const yargs = require("yargs");
const get_definitely_typed_1 = require("../get-definitely-typed");
const common_1 = require("../lib/common");
const packages_1 = require("../lib/packages");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const get_affected_packages_1 = require("./get-affected-packages");
if (!module.parent) {
    const selection = yargs.argv.all ? "all" : yargs.argv._[0] ? new RegExp(yargs.argv._[0]) : "affected";
    const options = testerOptions(!!yargs.argv.runFromDefinitelyTyped);
    util_1.logUncaughtErrors(get_definitely_typed_1.getDefinitelyTyped(options).then(dt => runTests(dt, options.definitelyTypedPath, parseNProcesses(), selection)));
}
function parseNProcesses() {
    const str = yargs.argv.nProcesses;
    if (!str) {
        return util_1.numberOfOsProcesses;
    }
    const nProcesses = Number.parseInt(str, 10);
    if (Number.isNaN(nProcesses)) {
        throw new Error("Expected nProcesses to be a number.");
    }
    return nProcesses;
}
exports.parseNProcesses = parseNProcesses;
function testerOptions(runFromDefinitelyTyped) {
    return runFromDefinitelyTyped
        ? { definitelyTypedPath: process.cwd(), progress: false, parseInParallel: true }
        : common_1.Options.defaults;
}
exports.testerOptions = testerOptions;
async function runTests(dt, definitelyTypedPath, nProcesses, selection) {
    const allPackages = await packages_1.AllPackages.read(dt);
    const { changedPackages, dependentPackages } = selection === "all"
        ? { changedPackages: allPackages.allTypings(), dependentPackages: [] }
        : selection === "affected"
            ? await get_affected_packages_1.default(allPackages, logging_1.consoleLogger.info, definitelyTypedPath)
            : { changedPackages: allPackages.allTypings().filter(t => selection.test(t.name)), dependentPackages: [] };
    console.log(`Testing ${changedPackages.length} changed packages: ${changedPackages.map(t => t.desc)}`);
    console.log(`Testing ${dependentPackages.length} dependent packages: ${dependentPackages.map(t => t.desc)}`);
    console.log(`Running with ${nProcesses} processes.`);
    const typesPath = `${definitelyTypedPath}/types`;
    await doInstalls(allPackages, [...changedPackages, ...dependentPackages], typesPath, nProcesses);
    console.log("Testing...");
    await doRunTests([...changedPackages, ...dependentPackages], new Set(changedPackages), typesPath, nProcesses);
}
exports.default = runTests;
async function doInstalls(allPackages, packages, typesPath, nProcesses) {
    console.log("Installing NPM dependencies...");
    // We need to run `npm install` for all dependencies, too, so that we have dependencies' dependencies installed.
    await util_1.nAtATime(nProcesses, get_affected_packages_1.allDependencies(allPackages, packages), async (pkg) => {
        const cwd = directoryPath(typesPath, pkg);
        if (!await fs_extra_1.pathExists(util_1.joinPaths(cwd, "package.json"))) {
            return;
        }
        // Scripts may try to compile native code.
        // This doesn't work reliably on travis, and we're just installing for the types, so ignore.
        const cmd = `npm install ${io_1.npmInstallFlags}`;
        console.log(`  ${cwd}: ${cmd}`);
        const stdout = await util_1.execAndThrowErrors(cmd, cwd);
        if (stdout) {
            // Must specify what this is for since these run in parallel.
            console.log(` from ${cwd}: ${stdout}`);
        }
    });
    await runCommand(console, undefined, require.resolve("dtslint"), ["--installAll"]);
}
function directoryPath(typesPath, pkg) {
    return util_1.joinPaths(typesPath, pkg.subDirectoryPath);
}
async function doRunTests(packages, changed, typesPath, nProcesses) {
    const allFailures = [];
    if (fold.isTravis()) {
        console.log(fold.start("tests"));
    }
    await util_1.runWithListeningChildProcesses({
        inputs: packages.map(p => ({ path: p.subDirectoryPath, onlyTestTsNext: !changed.has(p) })),
        commandLineArgs: ["--listen"],
        workerFile: require.resolve("dtslint"),
        nProcesses,
        cwd: typesPath,
        handleOutput(output) {
            const { path, status } = output;
            if (status === "OK") {
                console.log(`${path} OK`);
            }
            else {
                console.error(`${path} failing:`);
                console.error(status);
                allFailures.push([path, status]);
            }
        },
    });
    if (fold.isTravis()) {
        console.log(fold.end("tests"));
    }
    if (allFailures.length === 0) {
        return;
    }
    console.error("\n\n=== ERRORS ===\n");
    for (const [path, error] of allFailures) {
        console.error(`\n\nError in ${path}`);
        console.error(error);
    }
    throw new Error(`The following packages had errors: ${allFailures.map(e => e[0]).join(", ")}`);
}
async function runCommand(log, cwd, cmd, args) {
    const nodeCmd = `node ${cmd} ${args.join(" ")}`;
    log.info(`Running: ${nodeCmd}`);
    try {
        const { error, stdout, stderr } = await util_1.exec(nodeCmd, cwd);
        if (stdout) {
            log.info(stdout);
        }
        if (stderr) {
            log.error(stderr);
        }
        return error && { message: `${error.message}\n${stdout}\n${stderr}` };
    }
    catch (e) {
        return e;
    }
}
//# sourceMappingURL=test-runner.js.map