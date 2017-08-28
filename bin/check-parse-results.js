"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const semver = require("semver");
const common_1 = require("./lib/common");
const packages_1 = require("./lib/packages");
const settings_1 = require("./lib/settings");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(true, common_1.Options.defaults));
}
function main(includeNpmChecks, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const allPackages = yield packages_1.AllPackages.read(options);
        const [log, logResult] = logging_1.logger();
        checkPathMappings(allPackages);
        const packages = allPackages.allPackages();
        checkForDuplicates(packages, pkg => pkg.libraryName, "Library Name", log);
        checkForDuplicates(packages, pkg => pkg.projectName, "Project Name", log);
        if (includeNpmChecks) {
            yield util_1.nAtATime(10, allPackages.allTypings(), pkg => checkNpm(pkg, log), {
                name: "Checking for typed packages...",
                flavor: pkg => pkg.desc,
                options
            });
        }
        yield logging_1.writeLog("conflicts.md", logResult());
    });
}
exports.default = main;
function checkForDuplicates(packages, func, key, log) {
    const lookup = new Map();
    for (const info of packages) {
        const libraryOrProjectName = func(info);
        if (libraryOrProjectName !== undefined) {
            util_1.multiMapAdd(lookup, libraryOrProjectName, info);
        }
    }
    for (const [libName, values] of lookup) {
        if (values.length > 1) {
            log(` * Duplicate ${key} descriptions "${libName}"`);
            for (const n of values) {
                log(`   * ${n.desc}`);
            }
        }
    }
}
function checkPathMappings(allPackages) {
    for (const pkg of allPackages.allTypings()) {
        const pathMappings = new Map(pkg.pathMappings);
        const unusedPathMappings = new Set(pathMappings.keys());
        // If A depends on B, and B has path mappings, A must have the same mappings.
        for (const dependency of allPackages.allDependencyTypings(pkg)) {
            for (const [name, dependencyMappingVersion] of dependency.pathMappings) {
                if (pathMappings.get(name) !== dependencyMappingVersion) {
                    throw new Error(`${pkg.desc} depends on ${dependency.desc}, which has a path mapping for ${name} v${dependencyMappingVersion}. ` +
                        `${pkg.desc} must have the same path mappings as its dependencies.`);
                }
                unusedPathMappings.delete(name);
            }
            unusedPathMappings.delete(dependency.name);
        }
        for (const unusedPathMapping of unusedPathMappings) {
            throw new Error(`${pkg.desc} has unused path mapping for ${unusedPathMapping}`);
        }
    }
}
function checkNpm(pkg, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const asOfVersion = yield firstPackageVersionWithTypes(pkg.name);
        if (asOfVersion) {
            const ourVersion = `${pkg.major}.${pkg.minor}`;
            log(`Typings already defined for ${pkg.name} (${pkg.libraryName}) as of ${asOfVersion} (our version: ${ourVersion})`);
        }
    });
}
function packageHasTypes(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield firstPackageVersionWithTypes(packageName)) !== undefined;
    });
}
exports.packageHasTypes = packageHasTypes;
function firstPackageVersionWithTypes(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = settings_1.npmRegistry + packageName;
        const info = yield io_1.fetchJson(uri, { retries: true });
        // Info may be empty if the package is not on NPM
        if (!info.versions) {
            return undefined;
        }
        return firstVersionWithTypes(info.versions);
    });
}
function firstVersionWithTypes(versions) {
    const versionsWithTypings = Object.entries(versions).filter(([_version, info]) => hasTypes(info)).map(([version]) => version);
    // Type annotation needed because of https://github.com/Microsoft/TypeScript/issues/12915
    return util_1.best(versionsWithTypings, semver.lt);
}
function hasTypes(info) {
    return "types" in info || "typings" in info;
}
//# sourceMappingURL=check-parse-results.js.map