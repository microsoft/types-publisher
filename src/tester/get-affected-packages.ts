import { parseMajorVersionFromDirectoryName } from "../lib/definition-parser";
import { AllPackages, PackageBase, TypingsData, PackageId, DependencyVersion, getMangledNameForScopedPackage } from "../lib/packages";
import { sourceBranch, typesDirectoryName } from "../lib/settings";
import { Logger } from "../util/logging";
import { execAndThrowErrors, flatMap, mapDefined, mapIter, sort } from "../util/util";

export interface GitDiff {
    status: "A" | "D" | "M";
    file: string
}

export interface Affected {
    readonly changedPackages: ReadonlyArray<TypingsData>;
    readonly dependentPackages: ReadonlyArray<TypingsData>;
}

/** Gets all packages that have changed on this branch, plus all packages affected by the change. */
export function getAffectedPackages(allPackages: AllPackages, changedPackageIds: PackageId[]): Affected {
    const resolved = changedPackageIds.map(id => allPackages.tryResolve(id));
    // If a package doesn't exist, that's because it was deleted.
    const changed = mapDefined(resolved, id => allPackages.tryGetTypingsData(id));
    const dependent = mapIter(collectDependers(resolved, getReverseDependencies(allPackages, resolved)), p => allPackages.getTypingsData(p));
    return { changedPackages: changed, dependentPackages: sortPackages(dependent) };
}

/** Every package name in the original list, plus their dependencies (incl. dependencies' dependencies). */
export function allDependencies(allPackages: AllPackages, packages: Iterable<TypingsData>): TypingsData[] {
    return sortPackages(transitiveClosure(packages, pkg => allPackages.allDependencyTypings(pkg)));
}

/** Collect all packages that depend on changed packages, and all that depend on those, etc. */
function collectDependers(changedPackages: PackageId[], reverseDependencies: Map<PackageId, Set<PackageId>>): Set<PackageId> {
    const dependers = transitiveClosure(changedPackages, pkg => reverseDependencies.get(pkg) || []);
    // Don't include the original changed packages, just their dependers
    for (const original of changedPackages) {
        dependers.delete(original);
    }
    return dependers;
}

function sortPackages(packages: Iterable<TypingsData>): TypingsData[] {
    return sort<TypingsData>(packages, PackageBase.compare); // tslint:disable-line no-unbound-method
}

function transitiveClosure<T>(initialItems: Iterable<T>, getRelatedItems: (item: T) => Iterable<T>): Set<T> {
    const all = new Set<T>();
    const workList: T[] = [];

    function add(item: T): void {
        if (!all.has(item)) {
            all.add(item);
            workList.push(item);
        }
    }

    for (const item of initialItems) {
        add(item);
    }

    while (workList.length) {
        const item = workList.pop()!;
        for (const newItem of getRelatedItems(item)) {
            add(newItem);
        }
    }

    return all;
}

/** Generate a map from a package to packages that depend on it. */
function getReverseDependencies(allPackages: AllPackages, changedPackages: PackageId[]): Map<PackageId, Set<PackageId>> {
   const map = new Map<string, [PackageId, Set<PackageId>]>();
     for (const changed of changedPackages) {
         map.set(packageIdToKey(changed), [changed, new Set()]);
    }
    for (const typing of allPackages.allTypings()) {
        if (!map.has(packageIdToKey(typing.id))) {
            map.set(packageIdToKey(typing.id), [typing.id, new Set()]);
        }
    }
    for (const typing of allPackages.allTypings()) {
        for (const dependency of typing.dependencies) {
            const dependencies = map.get(packageIdToKey(allPackages.tryResolve(dependency)))
            if (dependencies) {
                dependencies[1].add(typing.id);
            }
        }
        for (const dependencyName of typing.testDependencies) {
            const latest = { name: dependencyName, majorVersion: "*" } as PackageId;
            const dependencies = map.get(packageIdToKey(allPackages.tryResolve(latest)));
            if (dependencies) {
                dependencies[1].add(typing.id);
            }
        }
    }
    return new Map(map.values())
}

function packageIdToKey(pkg: PackageId): string {
    return getMangledNameForScopedPackage(pkg.name) + "/v" + pkg.majorVersion;
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
