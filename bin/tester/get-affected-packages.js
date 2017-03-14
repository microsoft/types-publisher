"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const common_1 = require("../lib/common");
const definition_parser_1 = require("../lib/definition-parser");
const packages_1 = require("../lib/packages");
const settings_1 = require("../lib/settings");
const util_1 = require("../util/util");
if (!module.parent) {
    util_1.done(main(common_1.Options.defaults));
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const changes = yield getAffectedPackages(yield packages_1.AllPackages.read(options), console.log, options);
        console.log(util_1.join(util_1.map(changes, t => t.desc)));
    });
}
/** Gets all packages that have changed on this branch, plus all packages affected by the change. */
function getAffectedPackages(allPackages, log, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const changedPackageIds = yield gitChanges(log, options);
        // If a package doesn't exist, that's because it was deleted.
        const changedPackages = util_1.mapDefined(changedPackageIds, (({ name, majorVersion }) => majorVersion === "latest" ? allPackages.tryGetLatestVersion(name) : allPackages.tryGetTypingsData({ name, majorVersion })));
        const dependedOn = getReverseDependencies(allPackages);
        return collectDependers(changedPackages, dependedOn);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAffectedPackages;
/** Every package name in the original list, plus their dependencies (incl. dependencies' dependencies). */
function allDependencies(allPackages, packages) {
    return sortPackages(transitiveClosure(packages, pkg => allPackages.dependencyTypings(pkg)));
}
exports.allDependencies = allDependencies;
/** Collect all packages that depend on changed packages, and all that depend on those, etc. */
function collectDependers(changedPackages, reverseDependencies) {
    return sortPackages(transitiveClosure(changedPackages, pkg => reverseDependencies.get(pkg) || []));
}
function sortPackages(packages) {
    return util_1.sort(packages, packages_1.PackageBase.compare);
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
function gitChanges(log, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const changedPackages = new Map();
        for (const fileName of yield gitDiff(log, options)) {
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
        return util_1.flatMap(changedPackages, ([name, versions]) => util_1.map(versions, majorVersion => ({ name, majorVersion })));
    });
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
function gitDiff(log, options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield run(`git rev-parse --verify ${settings_1.sourceBranch}`);
        }
        catch (_) {
            // This is a shallow clone.
            yield run(`git fetch origin ${settings_1.sourceBranch}`);
            yield run(`git branch ${settings_1.sourceBranch} FETCH_HEAD`);
        }
        // `git diff foo...bar` gets all changes from X to `bar` where X is the common ancestor of `foo` and `bar`.
        // Source: https://git-scm.com/docs/git-diff
        let diff = (yield run(`git diff ${settings_1.sourceBranch}...HEAD --name-only`)).trim();
        if (diff === "") {
            // We are probably already on master, so compare to the last commit.
            diff = (yield run(`git diff ${settings_1.sourceBranch}~1...HEAD --name-only`)).trim();
        }
        return diff.split("\n");
        function run(cmd) {
            return __awaiter(this, void 0, void 0, function* () {
                log("Running: " + cmd);
                const stdout = yield util_1.execAndThrowErrors(cmd, options.definitelyTypedPath);
                log(stdout);
                return stdout;
            });
        }
    });
}
/**
 * For "a/b/c", returns { name: "a", version: "latest" }.
 * For "a/v3/c", returns { name: "a", version: 3 }.
 * For "a", returns undefined.
 */
function getDependencyFromFile(fileName) {
    const parts = fileName.split("/");
    if (parts.length === 1) {
        // It's not in a typings directory at all.
        return undefined;
    }
    const name = parts[0];
    if (!common_1.isTypingDirectory(name)) {
        return undefined;
    }
    if (parts.length > 2) {
        const majorVersion = definition_parser_1.parseMajorVersionFromDirectoryName(parts[1]);
        if (majorVersion !== undefined) {
            return { name, majorVersion };
        }
    }
    return { name, majorVersion: "latest" };
}
//# sourceMappingURL=get-affected-packages.js.map