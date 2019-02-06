"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_definitely_typed_1 = require("../get-definitely-typed");
const common_1 = require("../lib/common");
const definition_parser_1 = require("../lib/definition-parser");
const packages_1 = require("../lib/packages");
const settings_1 = require("../lib/settings");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
if (!module.parent) {
    util_1.logUncaughtErrors(main(common_1.Options.defaults));
}
async function main(options) {
    const changes = await getAffectedPackages(await packages_1.AllPackages.read(await get_definitely_typed_1.getDefinitelyTyped(options, logging_1.loggerWithErrors()[0])), logging_1.consoleLogger.info, options.definitelyTypedPath);
    console.log({ changedPackages: changes.changedPackages.map(t => t.desc), dependers: changes.dependentPackages.map(t => t.desc) });
}
/** Gets all packages that have changed on this branch, plus all packages affected by the change. */
async function getAffectedPackages(allPackages, log, definitelyTypedPath) {
    const changedPackageIds = await gitChanges(log, definitelyTypedPath);
    // If a package doesn't exist, that's because it was deleted.
    const changedPackages = util_1.mapDefined(changedPackageIds, (({ name, majorVersion }) => majorVersion === "latest" ? allPackages.tryGetLatestVersion(name) : allPackages.tryGetTypingsData({ name, majorVersion })));
    const dependentPackages = collectDependers(changedPackages, getReverseDependencies(allPackages));
    return { changedPackages, dependentPackages };
}
exports.default = getAffectedPackages;
/** Every package name in the original list, plus their dependencies (incl. dependencies' dependencies). */
function allDependencies(allPackages, packages) {
    return sortPackages(transitiveClosure(packages, pkg => allPackages.allDependencyTypings(pkg)));
}
exports.allDependencies = allDependencies;
/** Collect all packages that depend on changed packages, and all that depend on those, etc. */
function collectDependers(changedPackages, reverseDependencies) {
    const dependers = transitiveClosure(changedPackages, pkg => reverseDependencies.get(pkg) || []);
    // Don't include the original changed packages, just their dependers
    for (const original of changedPackages) {
        dependers.delete(original);
    }
    return sortPackages(dependers);
}
function sortPackages(packages) {
    return util_1.sort(packages, packages_1.PackageBase.compare); // tslint:disable-line no-unbound-method
}
function transitiveClosure(initialItems, getRelatedItems) {
    const all = new Set();
    const workList = [];
    function add(item) {
        if (!all.has(item)) {
            all.add(item);
            workList.push(item);
        }
    }
    for (const item of initialItems) {
        add(item);
    }
    while (workList.length) {
        const item = workList.pop();
        for (const newItem of getRelatedItems(item)) {
            add(newItem);
        }
    }
    return all;
}
/** Generate a map from a package to packages that depend on it. */
function getReverseDependencies(allPackages) {
    const map = new Map();
    for (const typing of allPackages.allTypings()) {
        map.set(typing, new Set());
    }
    for (const typing of allPackages.allTypings()) {
        for (const dependency of allPackages.allDependencyTypings(typing)) {
            map.get(dependency).add(typing);
        }
    }
    return map;
}
/** Returns all immediate subdirectories of the root directory that have changed. */
async function gitChanges(log, definitelyTypedPath) {
    const changedPackages = new Map();
    for (const fileName of await gitDiff(log, definitelyTypedPath)) {
        const dep = getDependencyFromFile(fileName);
        if (dep) {
            const versions = changedPackages.get(dep.name);
            if (!versions) {
                changedPackages.set(dep.name, new Set([dep.majorVersion]));
            }
            else {
                versions.add(dep.majorVersion);
            }
        }
    }
    return util_1.flatMap(changedPackages, ([name, versions]) => util_1.mapIter(versions, majorVersion => ({ name, majorVersion })));
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
    // `git diff foo...bar` gets all changes from X to `bar` where X is the common ancestor of `foo` and `bar`.
    // Source: https://git-scm.com/docs/git-diff
    let diff = (await run(`git diff ${settings_1.sourceBranch} --name-only`)).trim();
    if (diff === "") {
        // We are probably already on master, so compare to the last commit.
        diff = (await run(`git diff ${settings_1.sourceBranch}~1 --name-only`)).trim();
    }
    return diff.split("\n");
    async function run(cmd) {
        log(`Running: ${cmd}`);
        const stdout = await util_1.execAndThrowErrors(cmd, definitelyTypedPath);
        log(stdout);
        return stdout;
    }
}
/**
 * For "types/a/b/c", returns { name: "a", version: "latest" }.
 * For "types/a/v3/c", returns { name: "a", version: 3 }.
 * For "x", returns undefined.
 */
function getDependencyFromFile(fileName) {
    const parts = fileName.split("/");
    if (parts.length <= 2) {
        // It's not in a typings directory at all.
        return undefined;
    }
    const [typesDirName, name, subDirName] = parts; // Ignore any other parts
    if (typesDirName !== settings_1.typesDirectoryName) {
        return undefined;
    }
    if (subDirName) {
        // Looks like "types/a/v3/c"
        const majorVersion = definition_parser_1.parseMajorVersionFromDirectoryName(subDirName);
        if (majorVersion !== undefined) {
            return { name, majorVersion };
        }
    }
    return { name, majorVersion: "latest" };
}
//# sourceMappingURL=get-affected-packages.js.map