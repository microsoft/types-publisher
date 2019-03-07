import { pathExists } from "fs-extra";
import * as fold from "travis-fold";
import * as yargs from "yargs";

import { parseMajorVersionFromDirectoryName } from "../lib/definition-parser";
import { sourceBranch, typesDirectoryName } from "../lib/settings";
import { FS, getDefinitelyTyped } from "../get-definitely-typed";
import { Options, TesterOptions } from "../lib/common";
import { AllPackages, DependencyVersion, PackageId, TypingsData } from "../lib/packages";
import { npmInstallFlags } from "../util/io";
import { consoleLogger, Logger, LoggerWithErrors, loggerWithErrors } from "../util/logging";
import { exec, execAndThrowErrors, flatMap, joinPaths, logUncaughtErrors, mapIter, nAtATime, numberOfOsProcesses, runWithListeningChildProcesses } from "../util/util";

import { getAffectedPackages, Affected, allDependencies } from "./get-affected-packages";

if (!module.parent) {
    if (yargs.argv.affected) {
        logUncaughtErrors(testAffectedOnly(Options.defaults));
    }
    else {
        const selection = yargs.argv.all ? "all" : yargs.argv._[0] ? new RegExp(yargs.argv._[0]) : "affected";
        const options = testerOptions(!!yargs.argv.runFromDefinitelyTyped);
        logUncaughtErrors(
            getDefinitelyTyped(options, loggerWithErrors()[0]).then(dt => runTests(dt, options.definitelyTypedPath, parseNProcesses(), selection)));
    }
}

export interface GitDiff {
    status: "A" | "D" | "M";
    file: string
}

async function testAffectedOnly(options: TesterOptions): Promise<void> {
    const changes = getAffectedPackages(
        await AllPackages.read(await getDefinitelyTyped(options, loggerWithErrors()[0])),
        gitChanges(await gitDiff(consoleLogger.info, options.definitelyTypedPath)));
    console.log({ changedPackages: changes.changedPackages.map(t => t.desc), dependersLength: changes.dependentPackages.map(t => t.desc).length });
}

export function parseNProcesses(): number {
    const str = yargs.argv.nProcesses as string | undefined;
    if (!str) {
        return numberOfOsProcesses;
    }
    const nProcesses = Number.parseInt(str, 10);
    if (Number.isNaN(nProcesses)) {
        throw new Error("Expected nProcesses to be a number.");
    }
    return nProcesses;
}

export function testerOptions(runFromDefinitelyTyped: boolean): TesterOptions {
    return runFromDefinitelyTyped
        ? { definitelyTypedPath: process.cwd(), progress: false, parseInParallel: true }
        : Options.defaults;
}

export default async function runTests(
    dt: FS,
    definitelyTypedPath: string,
    nProcesses: number,
    selection: "all" | "affected" | RegExp,
): Promise<void> {
    const allPackages = await AllPackages.read(dt);
    const diffs = await gitDiff(consoleLogger.info, definitelyTypedPath);
    if (diffs.map(d => d.file).includes("notNeededPackages.json")) {
        checkDeletedFiles(allPackages, diffs);
        // TODO: Still need to check all dependents of the removed packages actually
        return;
    }
    const { changedPackages, dependentPackages }: Affected =
        selection === "all" ? { changedPackages: allPackages.allTypings(), dependentPackages: [] } :
        selection === "affected" ? getAffectedPackages(allPackages, gitChanges(diffs))
        : { changedPackages: allPackages.allTypings().filter(t => selection.test(t.name)), dependentPackages: [] };

    console.log(`Testing ${changedPackages.length} changed packages: ${changedPackages.map(t => t.desc)}`);
    console.log(`Testing ${dependentPackages.length} dependent packages: ${dependentPackages.map(t => t.desc)}`);
    console.log(`Running with ${nProcesses} processes.`);

    const typesPath = `${definitelyTypedPath}/types`;
    await doInstalls(allPackages, [...changedPackages, ...dependentPackages], typesPath, nProcesses);

    console.log("Testing...");
    await doRunTests([...changedPackages, ...dependentPackages], new Set(changedPackages), typesPath, nProcesses);
}

export function checkDeletedFiles(allPackages: AllPackages, diffs: GitDiff[]) {
    // 1. find all the deleted files and group by toplevel
    const toplevels = group(diffs.filter(d => d.status === "D"), d => {
        const x = getDependencyFromFile(d.file)
        if (!x) throw new Error(`Only oh no`);
        return x.name;
    });
    console.log(toplevels)
    for (const toplevel of toplevels.keys()) {
        // 2. Make sure that there are no packages left with deleted entries
        if (allPackages.hasTypingFor({ name: toplevel, majorVersion: "*" })) {
            throw new Error(`Please delete all files in ${toplevel} when adding it to notNeededPackages.json.`);
        }
        // 3. make sure that each toplevel deleted has a matching entry in notNeededPackages
    }
    // 4. now check that entry in notNeededPackages (note: might want to check ALL entries ok)
    //   a. xxxxxxxx
}

function group<T>(l: T[], key: (x: T) => string): Map<string, T[]> {
    const g = new Map<string, T[]>();
    for (const x of l) {
        const k = key(x);
        if (g.has(k)) {
            g.get(k)!.push(x);
        }
        else {
            g.set(k, [x]);
        }
    }
    return g;
}

async function doInstalls(allPackages: AllPackages, packages: Iterable<TypingsData>, typesPath: string, nProcesses: number): Promise<void> {
    console.log("Installing NPM dependencies...");

    // We need to run `npm install` for all dependencies, too, so that we have dependencies' dependencies installed.
    await nAtATime(nProcesses, allDependencies(allPackages, packages), async pkg => {
        const cwd = directoryPath(typesPath, pkg);
        if (!await pathExists(joinPaths(cwd, "package.json"))) {
            return;
        }

        // Scripts may try to compile native code.
        // This doesn't work reliably on travis, and we're just installing for the types, so ignore.
        const cmd = `npm install ${npmInstallFlags}`;
        console.log(`  ${cwd}: ${cmd}`);
        const stdout = await execAndThrowErrors(cmd, cwd);
        if (stdout) {
            // Must specify what this is for since these run in parallel.
            console.log(` from ${cwd}: ${stdout}`);
        }
    });

    await runCommand(console, undefined, require.resolve("dtslint"), ["--installAll"]);
}

function directoryPath(typesPath: string, pkg: TypingsData): string {
    return joinPaths(typesPath, pkg.subDirectoryPath);
}

async function doRunTests(
    packages: ReadonlyArray<TypingsData>,
    changed: ReadonlySet<TypingsData>,
    typesPath: string,
    nProcesses: number,
): Promise<void> {
    const allFailures: Array<[string, string]> = [];

    if (fold.isTravis()) { console.log(fold.start("tests")); }
    await runWithListeningChildProcesses({
        inputs: packages.map(p => ({ path: p.subDirectoryPath, onlyTestTsNext: !changed.has(p), expectOnly: !changed.has(p) })),
        commandLineArgs: ["--listen"],
        workerFile: require.resolve("dtslint"),
        nProcesses,
        cwd: typesPath,
        handleOutput(output): void {
            const { path, status } = output as { path: string, status: string };
            if (status === "OK") {
                console.log(`${path} OK`);
            } else {
                console.error(`${path} failing:`);
                console.error(status);
                allFailures.push([path, status]);
            }
        },
    });
    if (fold.isTravis()) { console.log(fold.end("tests")); }

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

interface TesterError {
    message: string;
}

async function runCommand(log: LoggerWithErrors, cwd: string | undefined, cmd: string, args: string[]): Promise<TesterError | undefined> {
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
        return e as TesterError;
    }
}


/** Returns all immediate subdirectories of the root directory that have changed. */
export function gitChanges(diffs: GitDiff[]): PackageId[] {
    const changedPackages = new Map<string, Set<DependencyVersion>>();

    for (const diff of diffs) {
        const dep = getDependencyFromFile(diff.file);
        if (dep) {
            const versions = changedPackages.get(dep.name);
            if (!versions) {
                changedPackages.set(dep.name, new Set([dep.majorVersion]));
            } else {
                versions.add(dep.majorVersion);
            }
        }
    }

    return Array.from(flatMap(changedPackages, ([name, versions]) =>
        mapIter(versions, majorVersion => ({ name, majorVersion }))));
}

/*
We have to be careful about how we get the diff because travis uses a shallow clone.

Travis runs:
    git clone --depth=50 https://github.com/DefinitelyTyped/DefinitelyTyped.git DefinitelyTyped
    cd DefinitelyTyped
    git fetch origin +refs/pull/123/merge
    git checkout -qf FETCH_HEAD

If editing this code, be sure to test on both full and shallow clones.
*/
export async function gitDiff(log: Logger, definitelyTypedPath: string): Promise<GitDiff[]> {
    try {
        await run(`git rev-parse --verify ${sourceBranch}`);
        // If this succeeds, we got the full clone.
    } catch (_) {
        // This is a shallow clone.
        await run(`git fetch origin ${sourceBranch}`);
        await run(`git branch ${sourceBranch} FETCH_HEAD`);
    }

    let diff = (await run(`git diff ${sourceBranch} --name-status`)).trim();
    if (diff === "") {
        // We are probably already on master, so compare to the last commit.
        diff = (await run(`git diff ${sourceBranch}~1 --name-status`)).trim();
    }
    return diff.split("\n").map(line => {
        var [status, file] = line.split(/\s+/, 2);
        return { status: status.trim(), file: file.trim() } as GitDiff;
    });

    async function run(cmd: string): Promise<string> {
        log(`Running: ${cmd}`);
        const stdout = await execAndThrowErrors(cmd, definitelyTypedPath);
        log(stdout);
        return stdout;
    }
}

/**
 * For "types/a/b/c", returns { name: "a", version: "*" }.
 * For "types/a/v3/c", returns { name: "a", version: 3 }.
 * For "x", returns undefined.
 */
function getDependencyFromFile(file: string): PackageId | undefined {
    const parts = file.split("/");
    if (parts.length <= 2) {
        // It's not in a typings directory at all.
        return undefined;
    }

    const [typesDirName, name, subDirName] = parts; // Ignore any other parts

    if (typesDirName !== typesDirectoryName) {
        return undefined;
    }

    if (subDirName) {
        // Looks like "types/a/v3/c"
        const majorVersion = parseMajorVersionFromDirectoryName(subDirName);
        if (majorVersion !== undefined) {
            return { name,  majorVersion };
        }
    }

    return { name, majorVersion: "*" };
}
