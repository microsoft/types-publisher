"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const packages_1 = require("../lib/packages");
const util_1 = require("../util/util");
/** Gets all packages that have changed on this branch, plus all packages affected by the change. */
function getAffectedPackages(allPackages, changedPackageIds) {
    const resolved = changedPackageIds.map(id => allPackages.tryResolve(id));
    // If a package doesn't exist, that's because it was deleted.
    const changed = util_1.mapDefined(resolved, id => allPackages.tryGetTypingsData(id));
    const dependent = util_1.mapIter(collectDependers(resolved, getReverseDependencies(allPackages, resolved)), p => allPackages.getTypingsData(p));
    return { changedPackages: changed, dependentPackages: sortPackages(dependent) };
}
exports.getAffectedPackages = getAffectedPackages;
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
    return dependers;
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
function getReverseDependencies(allPackages, changedPackages) {
    const map = new Map();
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
            const dependencies = map.get(packageIdToKey(allPackages.tryResolve(dependency)));
            if (dependencies) {
                dependencies[1].add(typing.id);
            }
        }
        for (const dependencyName of typing.testDependencies) {
            const latest = { name: dependencyName, majorVersion: "*" };
            const dependencies = map.get(packageIdToKey(allPackages.tryResolve(latest)));
            if (dependencies) {
                dependencies[1].add(typing.id);
            }
        }
    }
    return new Map(map.values());
}
function packageIdToKey(pkg) {
    return packages_1.getMangledNameForScopedPackage(pkg.name) + "/v" + pkg.majorVersion;
}
//# sourceMappingURL=get-affected-packages.js.map