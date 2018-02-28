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
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(true, common_1.Options.defaults, new io_1.Fetcher()));
}
function main(includeNpmChecks, options, fetcher) {
    return __awaiter(this, void 0, void 0, function* () {
        const allPackages = yield packages_1.AllPackages.read(options);
        const [log, logResult] = logging_1.logger();
        checkTypeScriptVersions(allPackages);
        checkPathMappings(allPackages);
        const packages = allPackages.allPackages();
        checkForDuplicates(packages, pkg => pkg.libraryName, "Library Name", log);
        checkForDuplicates(packages, pkg => pkg.projectName, "Project Name", log);
        const dependedOn = new Set();
        for (const pkg of packages) {
            if (pkg instanceof packages_1.TypingsData) {
                for (const dep of pkg.dependencies) {
                    dependedOn.add(dep.name);
                }
                for (const dep of pkg.testDependencies) {
                    dependedOn.add(dep);
                }
            }
        }
        if (includeNpmChecks) {
            yield util_1.nAtATime(10, allPackages.allTypings(), pkg => checkNpm(pkg, log, dependedOn, fetcher), {
                name: "Checking for typed packages...",
                flavor: pkg => pkg.desc,
                options,
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
function checkTypeScriptVersions(allPackages) {
    for (const pkg of allPackages.allTypings()) {
        for (const dep of allPackages.allDependencyTypings(pkg)) {
            if (dep.typeScriptVersion > pkg.typeScriptVersion) {
                throw new Error(`${pkg.desc} depends on ${dep.desc} but has a lower required TypeScript version.`);
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
            if (pkg.name !== unusedPathMapping) {
                throw new Error(`${pkg.desc} has unused path mapping for ${unusedPathMapping}`);
            }
        }
    }
}
function checkNpm({ major, minor, name, libraryName, projectName, contributors }, log, dependedOn, fetcher) {
    return __awaiter(this, void 0, void 0, function* () {
        if (notNeededExceptions.has(name)) {
            return;
        }
        const info = yield npm_client_1.fetchNpmInfo(name, fetcher);
        const versions = getRegularVersions(info.versions);
        const firstTypedVersion = util_1.best(util_1.mapDefined(versions, ({ hasTypes, version }) => hasTypes ? version : undefined), (a, b) => b.greaterThan(a));
        // A package might have added types but removed them later, so check the latest version too
        if (firstTypedVersion === undefined || !util_1.best(versions, (a, b) => a.version.greaterThan(b.version)).hasTypes) {
            return;
        }
        const ourVersion = `${major}.${minor}`;
        log("");
        log(`Typings already defined for ${name} (${libraryName}) as of ${firstTypedVersion.versionString} (our version: ${ourVersion})`);
        const contributorUrls = contributors.map(c => {
            const gh = "https://github.com/";
            return c.url.startsWith(gh) ? `@${c.url.slice(gh.length)}` : `${c.name} (${c.url})`;
        }).join(", ");
        log("  To fix this:");
        log(`  git checkout -b not-needed-${name}`);
        log(`  yarn not-needed ${name} ${firstTypedVersion.versionString} ${projectName}${libraryName !== name ? ` ${JSON.stringify(libraryName)}` : ""}`);
        log(`  git add --all && git commit -m "${name}: Provides its own types" && git push -u origin not-needed-${name}`);
        log(`  And comment PR: This will deprecate \`@types/${name}\` in favor of just \`${name}\`. CC ${contributorUrls}`);
        if (new versions_1.Semver(major, minor, 0, /*isPrerelease*/ false).greaterThan(firstTypedVersion)) {
            log("  WARNING: our version is greater!");
        }
        if (dependedOn.has(name)) {
            log("  WARNING: other packages depend on this!");
        }
    });
}
function packageHasTypes(packageName, fetcher) {
    return __awaiter(this, void 0, void 0, function* () {
        const info = yield npm_client_1.fetchNpmInfo(packageName, fetcher);
        return hasTypes(info.versions[info.version]);
    });
}
exports.packageHasTypes = packageHasTypes;
function getRegularVersions(versions) {
    // Versions can be undefined if an NPM package doesn't exist.
    return versions === undefined ? [] : util_1.mapDefined(Object.entries(versions), ([versionString, info]) => {
        const version = versions_1.Semver.tryParse(versionString, /*isPrerelease*/ false);
        return version === undefined ? undefined : { version, hasTypes: hasTypes(info) };
    });
}
function hasTypes(info) {
    return "types" in info || "typings" in info;
}
const notNeededExceptions = new Set([
    // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/22306
    "angular-ui-router", "ui-router-extras",
    // Declares to bundle types, but they're also in the `.npmignore` (https://github.com/nkovacic/angular-touchspin/issues/21)
    "angular-touchspin",
    // "typings" points to the wrong file (https://github.com/Microsoft/Bing-Maps-V8-TypeScript-Definitions/issues/31)
    "bingmaps",
    // Types are bundled, but not officially released (https://github.com/DefinitelyTyped/DefinitelyTyped/pull/22313#issuecomment-353225893)
    "dwt",
    // Waiting on some typing errors to be fixed (https://github.com/julien-c/epub/issues/30)
    "epub",
    // Typings file is not in package.json "files" list (https://github.com/silentmatt/expr-eval/issues/127)
    "expr-eval",
    // NPM package "express-serve-static-core" isn't a real package -- express-serve-static-core exists only for the purpose of types
    "express-serve-static-core",
    // Has "typings": "index.d.ts" but does not actually bundle typings. https://github.com/kolodny/immutability-helper/issues/79
    "immutability-helper",
    // Has `"typings": "compiled/typings/node-mysql-wrapper/node-mysql-wrapper.d.ts",`, but `compiled/typings` doesn't exist.
    // Package hasn't updated in 2 years and author seems to have deleted their account, so no chance of being fixed.
    "node-mysql-wrapper",
    // raspi packages bundle types, but can only be installed on a Raspberry Pi, so they are duplicated to DefinitelyTyped.
    // See https://github.com/DefinitelyTyped/DefinitelyTyped/pull/21618
    "raspi", "raspi-board", "raspi-gpio", "raspi-i2c", "raspi-led", "raspi-onewire", "raspi-peripheral", "raspi-pwm", "raspi-serial", "raspi-soft-pwm",
    // Declare "typings" but don't actually have them yet (https://github.com/stampit-org/stampit/issues/245)
    "stampit",
]);
//# sourceMappingURL=check-parse-results.js.map