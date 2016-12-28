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
const util_1 = require("../util/util");
if (!module.parent) {
    util_1.done(main(common_1.Options.defaults));
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const changes = yield getAffectedPackages(yield common_1.readTypesDataFile(), console.log, options);
        console.log(Array.from(changes).map(t => t.typingsPackageName));
    });
}
/** Gets all packages that have changed on this branch, plus all packages affected by the change. */
function getAffectedPackages(typings, log, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const changedPackageNames = yield gitChanges(log, options);
        const dependedOn = getReverseDependencies(typings);
        return collectDependers(typings, changedPackageNames, dependedOn);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAffectedPackages;
/** Every package name in the original list, plus their dependencies (incl. dependencies' dependencies). */
function allDependencies(typings, packages) {
    return Array.from(transitiveClosure(packages, pkg => packagesFromNames(typings, getDependencies(pkg))));
}
exports.allDependencies = allDependencies;
/** Collect all packages that depend on changed packages, and all that depend on those, etc. */
function collectDependers(typings, changedPackageNames, reverseDependencies) {
    return sortPackages(transitiveClosure(packagesFromNames(typings, changedPackageNames), pkg => reverseDependencies.get(pkg) || []));
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
function* packagesFromNames(typings, names) {
    for (const name of names) {
        if (name in typings) {
            yield typings[name];
        }
    }
}
function sortPackages(packages) {
    return Array.from(packages).sort((a, b) => a.typingsPackageName.localeCompare(b.typingsPackageName));
}
/** Generate a map from a package to packages that depend on it. */
function getReverseDependencies(typesData) {
    const map = new Map();
    const typings = common_1.typingsFromData(typesData);
    for (const typing of typings) {
        map.set(typing, new Set());
    }
    for (const typing of typings) {
        for (const dependencyName of getDependencies(typing)) {
            const dependency = typesData[dependencyName];
            if (dependency) {
                map.get(dependency).add(typing);
            }
        }
    }
    return map;
}
function getDependencies(typing) {
    return typing.libraryDependencies.concat(typing.moduleDependencies);
}
/** Returns all immediate subdirectories of the root directory that have changed. */
function gitChanges(log, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const changedPackages = new Set();
        for (const fileName of yield gitDiff(log, options)) {
            const root = rootDirName(fileName);
            if (root) {
                changedPackages.add(root);
            }
        }
        return changedPackages;
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
            yield run(`git rev-parse --verify ${common_1.settings.sourceBranch}`);
        }
        catch (_) {
            // This is a shallow clone.
            yield run(`git fetch origin ${common_1.settings.sourceBranch}`);
            yield run(`git branch ${common_1.settings.sourceBranch} FETCH_HEAD`);
        }
        // `git diff foo...bar` gets all changes from X to `bar` where X is the common ancestor of `foo` and `bar`.
        // Source: https://git-scm.com/docs/git-diff
        const diff = yield run(`git diff ${common_1.settings.sourceBranch}...HEAD --name-only`);
        return diff.trim().split("\n");
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
// For "a/b/c", returns "a". For "a", returns undefined.
function rootDirName(fileName) {
    const slash = fileName.indexOf("/");
    return slash === -1 ? undefined : fileName.slice(0, slash);
}
//# sourceMappingURL=get-affected-packages.js.map