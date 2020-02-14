"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const os = require("os");
const fold = require("travis-fold");
const yargs = require("yargs");
const get_definitely_typed_1 = require("../get-definitely-typed");
const common_1 = require("../lib/common");
const definition_parser_1 = require("../lib/definition-parser");
const npm_client_1 = require("../lib/npm-client");
const packages_1 = require("../lib/packages");
const settings_1 = require("../lib/settings");
const versions_1 = require("../lib/versions");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const get_affected_packages_1 = require("./get-affected-packages");
const perfDir = util_1.joinPaths(os.homedir(), ".dts", "perf");
if (!module.parent) {
    if (yargs.argv.affected) {
        util_1.logUncaughtErrors(testAffectedOnly(common_1.Options.defaults));
    }
    else {
        const selection = yargs.argv.all ? "all" : yargs.argv._[0] ? new RegExp(yargs.argv._[0]) : "affected";
        const options = testerOptions(!!yargs.argv.runFromDefinitelyTyped);
        util_1.logUncaughtErrors(get_definitely_typed_1.getDefinitelyTyped(options, logging_1.loggerWithErrors()[0]).then(dt => runTests(dt, options.definitelyTypedPath, parseNProcesses(), selection)));
    }
}
async function testAffectedOnly(options) {
    const changes = get_affected_packages_1.getAffectedPackages(await packages_1.AllPackages.read(await get_definitely_typed_1.getDefinitelyTyped(options, logging_1.loggerWithErrors()[0])), gitChanges(await gitDiff(logging_1.consoleLogger.info, options.definitelyTypedPath)));
    console.log({ changedPackages: changes.changedPackages.map(t => t.desc), dependersLength: changes.dependentPackages.map(t => t.desc).length });
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
    const { changedPackages, dependentPackages, allPackages } = await getAffectedPackagesFromDiff(dt, definitelyTypedPath, selection);
    console.log(`Running with ${nProcesses} processes.`);
    const typesPath = `${definitelyTypedPath}/types`;
    await doInstalls(allPackages, [...changedPackages, ...dependentPackages], typesPath);
    console.log("Testing...");
    await doRunTests([...changedPackages, ...dependentPackages], new Set(changedPackages), typesPath, nProcesses);
}
exports.default = runTests;
async function getAffectedPackagesFromDiff(dt, definitelyTypedPath, selection) {
    const allPackages = await packages_1.AllPackages.read(dt);
    const diffs = await gitDiff(logging_1.consoleLogger.info, definitelyTypedPath);
    if (diffs.find(d => d.file === "notNeededPackages.json")) {
        const uncached = new npm_client_1.UncachedNpmInfoClient();
        for (const deleted of getNotNeededPackages(allPackages, diffs)) {
            const source = await uncached.fetchNpmInfo(deleted.libraryName); // eg @babel/parser
            const typings = await uncached.fetchNpmInfo(deleted.fullNpmName); // eg @types/babel__parser
            checkNotNeededPackage(deleted, source, typings);
        }
    }
    const affected = selection === "all" ? { changedPackages: allPackages.allTypings(), dependentPackages: [], allPackages }
        : selection === "affected" ? get_affected_packages_1.getAffectedPackages(allPackages, gitChanges(diffs))
            : { changedPackages: allPackages.allTypings().filter(t => selection.test(t.name)), dependentPackages: [], allPackages };
    console.log(`Testing ${affected.changedPackages.length} changed packages: ${affected.changedPackages.map(t => t.desc)}`);
    console.log(`Testing ${affected.dependentPackages.length} dependent packages: ${affected.dependentPackages.map(t => t.desc)}`);
    return affected;
}
exports.getAffectedPackagesFromDiff = getAffectedPackagesFromDiff;
/**
 * 1. find all the deleted files and group by toplevel
 * 2. Make sure that there are no packages left with deleted entries
 * 3. make sure that each toplevel deleted has a matching entry in notNeededPackages
 */
function getNotNeededPackages(allPackages, diffs) {
    const deletedPackages = new Set(diffs.filter(d => d.status === "D").map(d => util_1.assertDefined(getDependencyFromFile(d.file), `Unexpected file deleted: ${d.file}
When removing packages, you should only delete files that are a part of removed packages.`)
        .name));
    return util_1.mapIter(deletedPackages, p => {
        if (allPackages.hasTypingFor({ name: p, version: "*" })) {
            throw new Error(`Please delete all files in ${p} when adding it to notNeededPackages.json.`);
        }
        return util_1.assertDefined(allPackages.getNotNeededPackage(p), `Deleted package ${p} is not in notNeededPackages.json.`);
    });
}
exports.getNotNeededPackages = getNotNeededPackages;
/**
 * 1. libraryName must exist on npm (SKIPPED and preferably/optionally have been the libraryName in just-deleted header)
 * (SKIPPED 2.) sourceRepoURL must exist and be the npm homepage
 * 3. asOfVersion must be newer than `@types/name@latest` on npm
 * 4. `name@asOfVersion` must exist on npm
 *
 * I skipped (2) because the cached npm info doesn't include it. I might add it later.
 */
function checkNotNeededPackage(unneeded, source, typings) {
    source = util_1.assertDefined(source, `The entry for ${unneeded.fullNpmName} in notNeededPackages.json has
"libraryName": "${unneeded.libraryName}", but there is no npm package with this name.
Unneeded packages have to be replaced with a package on npm.`);
    typings = util_1.assertDefined(typings, `Unexpected error: @types package not found for ${unneeded.fullNpmName}`);
    const latestTypings = versions_1.Semver.parse(util_1.assertDefined(typings.distTags.get("latest"), `Unexpected error: ${unneeded.fullNpmName} is missing the "latest" tag.`));
    assert(unneeded.version.greaterThan(latestTypings), `The specified version ${unneeded.version.versionString} of ${unneeded.libraryName} must be newer than the version
it is supposed to replace, ${latestTypings.versionString} of ${unneeded.fullNpmName}.`);
    assert(source.versions.has(unneeded.version.versionString), `The specified version ${unneeded.version.versionString} of ${unneeded.libraryName} is not on npm.`);
}
exports.checkNotNeededPackage = checkNotNeededPackage;
async function doInstalls(allPackages, packages, typesPath) {
    console.log("Installing NPM dependencies...");
    // We need to run `npm install` for all dependencies, too, so that we have dependencies' dependencies installed.
    for (const pkg of get_affected_packages_1.allDependencies(allPackages, packages)) {
        const cwd = directoryPath(typesPath, pkg);
        if (!await fs_extra_1.pathExists(util_1.joinPaths(cwd, "package.json"))) {
            continue;
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
    }
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
        inputs: packages.map(p => ({ path: p.subDirectoryPath, onlyTestTsNext: !changed.has(p), expectOnly: !changed.has(p) })),
        commandLineArgs: ["--listen"],
        workerFile: require.resolve("dtslint"),
        nProcesses,
        crashRecovery: true,
        crashRecoveryMaxOldSpaceSize: 0,
        cwd: typesPath,
        handleStart(input, processIndex) {
            const prefix = processIndex === undefined ? "" : `${processIndex}> `;
            console.log(`${prefix}${input.path} START`);
        },
        handleOutput(output, processIndex) {
            const prefix = processIndex === undefined ? "" : `${processIndex}> `;
            const { path, status } = output;
            if (status === "OK") {
                console.log(`${prefix}${path} OK`);
            }
            else {
                console.error(`${prefix}${path} failing:`);
                console.error(prefix ? status.split(/\r?\n/).map(line => `${prefix}${line}`).join("\n") : status);
                allFailures.push([path, status]);
            }
        },
        handleCrash(input, state, processIndex) {
            const prefix = processIndex === undefined ? "" : `${processIndex}> `;
            switch (state) {
                case 1 /* Retry */:
                    console.warn(`${prefix}${input.path} Out of memory: retrying`);
                    break;
                case 2 /* RetryWithMoreMemory */:
                    console.warn(`${prefix}${input.path} Out of memory: retrying with increased memory (4096M)`);
                    break;
                case 3 /* Crashed */:
                    console.error(`${prefix}${input.path} Out of memory: failed`);
                    allFailures.push([input.path, "Out of memory"]);
                    break;
                default:
            }
        },
    });
    if (fold.isTravis()) {
        console.log(fold.end("tests"));
    }
    console.log("\n\n=== PERFORMANCE ===\n");
    console.log("{");
    for (const change of changed) {
        const path = util_1.joinPaths(perfDir, change.name + ".json");
        if (fs_1.existsSync(path)) {
            const perf = JSON.parse(fs_1.readFileSync(path, "utf8"));
            console.log(`  "${change.name}": ${perf[change.name].typeCount},`);
        }
    }
    console.log("}");
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
/** Returns all immediate subdirectories of the root directory that have changed. */
function gitChanges(diffs) {
    const changedPackages = new Map();
    for (const diff of diffs) {
        const dep = getDependencyFromFile(diff.file);
        if (dep) {
            const versions = changedPackages.get(dep.name);
            if (!versions) {
                changedPackages.set(dep.name, new Map([[packages_1.formatDependencyVersion(dep.version), dep.version]]));
            }
            else {
                versions.set(packages_1.formatDependencyVersion(dep.version), dep.version);
            }
        }
    }
    return Array.from(util_1.flatMap(changedPackages, ([name, versions]) => util_1.mapIter(versions, ([_, version]) => ({ name, version }))));
}
exports.gitChanges = gitChanges;
/*
We have to be careful about how we get the diff because travis uses a shallow clone.

Travis runs:
    git clone --depth=50 https://github.com/DefinitelyTyped/DefinitelyTyped.git DefinitelyTyped
    cd DefinitelyTyped
    git fetch origin +refs/pull/123/merge
    git checkout -qf FETCH_HEAD

If editing this code, be sure to test on both full and shallow clones.
*/
async function gitDiff(log, definitelyTypedPath) {
    try {
        await run(`git rev-parse --verify ${settings_1.sourceBranch}`);
        // If this succeeds, we got the full clone.
    }
    catch (_) {
        // This is a shallow clone.
        await run(`git fetch origin ${settings_1.sourceBranch}`);
        await run(`git branch ${settings_1.sourceBranch} FETCH_HEAD`);
    }
    let diff = (await run(`git diff ${settings_1.sourceBranch} --name-status`)).trim();
    if (diff === "") {
        // We are probably already on master, so compare to the last commit.
        diff = (await run(`git diff ${settings_1.sourceBranch}~1 --name-status`)).trim();
    }
    return diff.split("\n").map(line => {
        const [status, file] = line.split(/\s+/, 2);
        return { status: status.trim(), file: file.trim() };
    });
    async function run(cmd) {
        log(`Running: ${cmd}`);
        const stdout = await util_1.execAndThrowErrors(cmd, definitelyTypedPath);
        log(stdout);
        return stdout;
    }
}
exports.gitDiff = gitDiff;
/**
 * For "types/a/b/c", returns { name: "a", version: "*" }.
 * For "types/a/v3/c", returns { name: "a", version: 3 }.
 * For "x", returns undefined.
 */
function getDependencyFromFile(file) {
    const parts = file.split("/");
    if (parts.length <= 2) {
        // It's not in a typings directory at all.
        return undefined;
    }
    const [typesDirName, name, subDirName] = parts; // Ignore any other parts
    if (typesDirName !== settings_1.typesDirectoryName) {
        return undefined;
    }
    if (subDirName) {
        const version = definition_parser_1.parseVersionFromDirectoryName(subDirName);
        if (version !== undefined) {
            return { name, version };
        }
    }
    return { name, version: "*" };
}
//# sourceMappingURL=test-runner.js.map