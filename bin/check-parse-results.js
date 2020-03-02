"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageHasTypes = void 0;
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const log = logging_1.loggerWithErrors()[0];
    util_1.logUncaughtErrors(async () => checkParseResults(true, await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, log), common_1.Options.defaults, new npm_client_1.UncachedNpmInfoClient()));
}
async function checkParseResults(includeNpmChecks, dt, options, client) {
    const allPackages = await packages_1.AllPackages.read(dt);
    const [log, logResult] = logging_1.logger();
    checkTypeScriptVersions(allPackages);
    checkPathMappings(allPackages);
    const dependedOn = new Set();
    const packages = allPackages.allPackages();
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
        await util_1.nAtATime(10, allPackages.allTypings(), pkg => checkNpm(pkg, log, dependedOn, client), {
            name: "Checking for typed packages...",
            flavor: pkg => pkg.desc,
            options,
        });
    }
    await logging_1.writeLog("conflicts.md", logResult());
}
exports.default = checkParseResults;
function checkTypeScriptVersions(allPackages) {
    for (const pkg of allPackages.allTypings()) {
        for (const dep of allPackages.allDependencyTypings(pkg)) {
            if (dep.minTypeScriptVersion > pkg.minTypeScriptVersion) {
                throw new Error(`${pkg.desc} depends on ${dep.desc} but has a lower required TypeScript version.`);
            }
        }
    }
}
function checkPathMappings(allPackages) {
    for (const pkg of allPackages.allTypings()) {
        const pathMappings = new Map(pkg.pathMappings.map(p => [p.packageName, p.version]));
        const unusedPathMappings = new Set(pathMappings.keys());
        // If A depends on B, and B has path mappings, A must have the same mappings.
        for (const dependency of allPackages.allDependencyTypings(pkg)) {
            for (const { packageName: transitiveDependencyName, version: transitiveDependencyVersion } of dependency.pathMappings) {
                const pathMappingVersion = pathMappings.get(transitiveDependencyName);
                if (pathMappingVersion
                    && (pathMappingVersion.major !== transitiveDependencyVersion.major
                        || pathMappingVersion.minor !== transitiveDependencyVersion.minor)) {
                    const expectedPathMapping = `${transitiveDependencyName}/v${packages_1.formatTypingVersion(transitiveDependencyVersion)}`;
                    throw new Error(`${pkg.desc} depends on ${dependency.desc}, which has a path mapping for ${expectedPathMapping}. ` +
                        `${pkg.desc} must have the same path mappings as its dependencies.`);
                }
                unusedPathMappings.delete(transitiveDependencyName);
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
async function checkNpm({ major, minor, name, libraryName, projectName, contributors }, log, dependedOn, client) {
    if (notNeededExceptions.has(name)) {
        return;
    }
    const info = await client.fetchRawNpmInfo(name); // Gets info for the real package, not the @types package
    if (!info) {
        return;
    }
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
    const yarnargs = [name, firstTypedVersion.versionString, projectName];
    if (libraryName !== name) {
        yarnargs.push(JSON.stringify(libraryName));
    }
    log("  yarn not-needed " + yarnargs.join(" "));
    log(`  git add --all && git commit -m "${name}: Provides its own types" && git push -u origin not-needed-${name}`);
    log(`  And comment PR: This will deprecate \`@types/${name}\` in favor of just \`${name}\`. CC ${contributorUrls}`);
    if (new versions_1.Semver(major, minor, 0).greaterThan(firstTypedVersion)) {
        log("  WARNING: our version is greater!");
    }
    if (dependedOn.has(name)) {
        log("  WARNING: other packages depend on this!");
    }
}
async function packageHasTypes(packageName, client) {
    const info = util_1.assertDefined(await client.fetchRawNpmInfo(packageName));
    return versionHasTypes(info.versions[info["dist-tags"].latest]);
}
exports.packageHasTypes = packageHasTypes;
function getRegularVersions(versions) {
    return util_1.mapDefined(Object.entries(versions), ([versionString, info]) => {
        const version = versions_1.Semver.tryParse(versionString);
        return version === undefined ? undefined : { version, hasTypes: versionHasTypes(info) };
    });
}
function versionHasTypes(info) {
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
    "raspi", "raspi-board", "raspi-gpio", "raspi-i2c", "raspi-led", "raspi-onewire",
    "raspi-peripheral", "raspi-pwm", "raspi-serial", "raspi-soft-pwm",
    // Declare "typings" but don't actually have them yet (https://github.com/stampit-org/stampit/issues/245)
    "stampit",
]);
//# sourceMappingURL=check-parse-results.js.map