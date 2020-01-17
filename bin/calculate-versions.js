"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const log = logging_1.loggerWithErrors()[0];
    util_1.logUncaughtErrors(async () => calculateVersions(await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, log), new npm_client_1.UncachedNpmInfoClient(), log));
}
async function calculateVersions(dt, uncachedClient, log) {
    log.info("=== Calculating versions ===");
    return npm_client_1.withNpmCache(uncachedClient, async (client) => {
        log.info("* Reading packages...");
        const packages = await packages_1.AllPackages.read(dt);
        return computeAndSaveChangedPackages(packages, log, client);
    });
}
exports.default = calculateVersions;
async function computeAndSaveChangedPackages(allPackages, log, client) {
    const cp = await computeChangedPackages(allPackages, log, client);
    const json = {
        changedTypings: cp.changedTypings.map(({ pkg: { id }, version, latestVersion }) => ({ id, version, latestVersion })),
        changedNotNeededPackages: cp.changedNotNeededPackages.map(p => p.name),
    };
    await common_1.writeDataFile(versions_1.versionsFilename, json);
    return cp;
}
async function computeChangedPackages(allPackages, log, client) {
    log.info("# Computing changed packages...");
    const changedTypings = await util_1.mapDefinedAsync(allPackages.allTypings(), async (pkg) => {
        const { version, needsPublish } = await fetchTypesPackageVersionInfo(pkg, client, /*publish*/ true, log);
        if (needsPublish) {
            log.info(`Changed: ${pkg.desc}`);
            for (const { name } of pkg.packageJsonDependencies) {
                util_1.assertDefined(await client.fetchAndCacheNpmInfo(name), `'${pkg.name}' depends on '${name}' which does not exist on npm. All dependencies must exist.`);
            }
            const latestVersion = pkg.isLatest ?
                undefined :
                (await fetchTypesPackageVersionInfo(allPackages.getLatest(pkg), client, /*publish*/ true)).version;
            return { pkg, version, latestVersion };
        }
        return undefined;
    });
    log.info("# Computing deprecated packages...");
    const changedNotNeededPackages = await util_1.mapDefinedAsync(allPackages.allNotNeeded(), async (pkg) => {
        if (!await isAlreadyDeprecated(pkg, client, log)) {
            util_1.assertDefined(await client.fetchAndCacheNpmInfo(pkg.unescapedName), `To deprecate '@types/${pkg.name}', '${pkg.unescapedName}' must exist on npm.`);
            log.info(`To be deprecated: ${pkg.name}`);
            return pkg;
        }
        return undefined;
    });
    return { changedTypings, changedNotNeededPackages };
}
async function fetchTypesPackageVersionInfo(pkg, client, canPublish, log) {
    let info = client.getNpmInfoFromCache(pkg.fullEscapedNpmName);
    let latestVersion = info && getHighestVersionForMajor(info.versions, pkg);
    let latestVersionInfo = latestVersion && util_1.assertDefined(info.versions.get(latestVersion.versionString));
    if (!latestVersionInfo || latestVersionInfo.typesPublisherContentHash !== pkg.contentHash) {
        if (log) {
            log.info(`Version info not cached for ${pkg.desc}`);
        }
        info = await client.fetchAndCacheNpmInfo(pkg.fullEscapedNpmName);
        latestVersion = info && getHighestVersionForMajor(info.versions, pkg);
        latestVersionInfo = latestVersion && util_1.assertDefined(info.versions.get(latestVersion.versionString));
        if (!latestVersionInfo) {
            return { version: versionString(pkg, /*patch*/ 0), needsPublish: true };
        }
    }
    if (latestVersionInfo.deprecated) {
        // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/22306
        assert(pkg.name === "angular-ui-router" || pkg.name === "ui-router-extras", `Package ${pkg.name} has been deprecated, so we shouldn't have parsed it. Was it re-added?`);
    }
    const needsPublish = canPublish && pkg.contentHash !== latestVersionInfo.typesPublisherContentHash;
    const patch = needsPublish ? (latestVersion.minor === pkg.minor ? latestVersion.patch + 1 : 0) : latestVersion.patch;
    return { version: versionString(pkg, patch), needsPublish };
}
function versionString(pkg, patch) {
    return new versions_1.Semver(pkg.major, pkg.minor, patch).versionString;
}
async function isAlreadyDeprecated(pkg, client, log) {
    const cachedInfo = client.getNpmInfoFromCache(pkg.fullEscapedNpmName);
    let latestVersion = cachedInfo && util_1.assertDefined(cachedInfo.distTags.get("latest"));
    let latestVersionInfo = cachedInfo && latestVersion && util_1.assertDefined(cachedInfo.versions.get(latestVersion));
    if (!latestVersionInfo || !latestVersionInfo.deprecated) {
        log.info(`Version info not cached for deprecated package ${pkg.desc}`);
        const info = util_1.assertDefined(await client.fetchAndCacheNpmInfo(pkg.fullEscapedNpmName));
        latestVersion = util_1.assertDefined(info.distTags.get("latest"));
        latestVersionInfo = util_1.assertDefined(info.versions.get(latestVersion));
    }
    return !!latestVersionInfo.deprecated;
}
function getHighestVersionForMajor(versions, { major, minor }) {
    const patch = latestPatchMatchingMajorAndMinor(versions.keys(), major, minor);
    return patch === undefined ? undefined : new versions_1.Semver(major, minor, patch);
}
/** Finds the version with matching major/minor with the latest patch version. */
function latestPatchMatchingMajorAndMinor(versions, newMajor, newMinor) {
    const versionsWithTypings = util_1.mapDefined(versions, v => {
        const semver = versions_1.Semver.tryParse(v);
        if (!semver) {
            return undefined;
        }
        const { major, minor, patch } = semver;
        return major === newMajor && minor === newMinor ? patch : undefined;
    });
    return util_1.best(versionsWithTypings, (a, b) => a > b);
}
async function getLatestTypingVersion(pkg, client) {
    return (await fetchTypesPackageVersionInfo(pkg, client, /*publish*/ false)).version;
}
exports.getLatestTypingVersion = getLatestTypingVersion;
//# sourceMappingURL=calculate-versions.js.map