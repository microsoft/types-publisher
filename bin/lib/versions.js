"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const util_1 = require("../util/util");
const common_1 = require("./common");
const versionsFilename = "versions.json";
async function readChangedPackages(allPackages) {
    const json = await common_1.readDataFile("calculate-versions", versionsFilename);
    return {
        changedTypings: json.changedTypings.map(({ id, version, latestVersion }) => ({ pkg: allPackages.getTypingsData(id), version, latestVersion })),
        changedNotNeededPackages: json.changedNotNeededPackages.map(id => allPackages.getNotNeededPackage(id)),
    };
}
exports.readChangedPackages = readChangedPackages;
async function computeAndSaveChangedPackages(allPackages, log, client) {
    const cp = await computeChangedPackages(allPackages, log, client);
    const json = {
        changedTypings: cp.changedTypings.map(({ pkg: { id }, version, latestVersion }) => ({ id, version, latestVersion })),
        changedNotNeededPackages: cp.changedNotNeededPackages.map(p => p.name),
    };
    await common_1.writeDataFile(versionsFilename, json);
    return cp;
}
exports.computeAndSaveChangedPackages = computeAndSaveChangedPackages;
async function computeChangedPackages(allPackages, log, client) {
    const changedTypings = await util_1.mapDefinedAsync(allPackages.allTypings(), async (pkg) => {
        const { version, needsPublish } = await fetchTypesPackageVersionInfo(pkg, client, log);
        if (needsPublish) {
            log(`Changed: ${pkg.desc}`);
            const latestVersion = pkg.isLatest ? undefined : (await fetchTypesPackageVersionInfo(allPackages.getLatest(pkg), client)).version;
            return { pkg, version, latestVersion };
        }
        return undefined;
    });
    const changedNotNeededPackages = await util_1.mapDefinedAsync(allPackages.allNotNeeded(), async (pkg) => {
        if (!await isNotNeededPackageAlreadyDeprecated(pkg, client, log)) {
            log(`Now deprecated: ${pkg.name}`);
            return pkg;
        }
        return undefined;
    });
    return { changedTypings, changedNotNeededPackages };
}
async function getLatestTypingVersion(pkg, client) {
    return (await fetchTypesPackageVersionInfo(pkg, client)).version;
}
exports.getLatestTypingVersion = getLatestTypingVersion;
/** Version of a package published to NPM. */
class Semver {
    constructor(major, minor, patch) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
    static parse(semver) {
        const result = Semver.tryParse(semver);
        if (!result) {
            throw new Error(`Unexpected semver: ${semver}`);
        }
        return result;
    }
    static fromRaw({ major, minor, patch }) {
        return new Semver(major, minor, patch);
    }
    // This must parse the output of `versionString`.
    static tryParse(semver) {
        // Per the semver spec <http://semver.org/#spec-item-2>:
        // "A normal version number MUST take the form X.Y.Z where X, Y, and Z are non-negative integers, and MUST NOT contain leading zeroes."
        const rgx = /^(\d+)\.(\d+)\.(\d+)$/;
        const match = rgx.exec(semver);
        return match ? new Semver(util_1.intOfString(match[1]), util_1.intOfString(match[2]), util_1.intOfString(match[3])) : undefined;
    }
    get versionString() {
        const { major, minor, patch } = this;
        return `${major}.${minor}.${patch}`;
    }
    equals(sem) {
        return this.major === sem.major && this.minor === sem.minor && this.patch === sem.patch;
    }
    greaterThan(sem) {
        return this.major > sem.major || this.major === sem.major
            && (this.minor > sem.minor || this.minor === sem.minor && this.patch > sem.patch);
    }
}
exports.Semver = Semver;
async function fetchTypesPackageVersionInfo(pkg, client, log) {
    let info = client.getNpmInfoFromCache(pkg.fullEscapedNpmName);
    let latestVersion = info && getHighestVersionForMajor(info.versions, pkg);
    let latestVersionInfo = latestVersion && util_1.assertDefined(info.versions.get(latestVersion.versionString));
    if (!latestVersionInfo || latestVersionInfo.typesPublisherContentHash !== pkg.contentHash) {
        if (log) {
            log(`Version info not cached for ${pkg.desc}`);
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
    const needsPublish = pkg.contentHash !== latestVersionInfo.typesPublisherContentHash;
    const patch = needsPublish ? (latestVersion.minor === pkg.minor ? latestVersion.patch + 1 : 0) : latestVersion.patch;
    return { version: versionString(pkg, patch), needsPublish };
}
function versionString(pkg, patch) {
    return new Semver(pkg.major, pkg.minor, patch).versionString;
}
async function isNotNeededPackageAlreadyDeprecated(pkg, client, log) {
    const cachedInfo = client.getNpmInfoFromCache(pkg.fullEscapedNpmName);
    let latestVersion = cachedInfo && util_1.assertDefined(cachedInfo.distTags.get("latest"));
    let latestVersionInfo = cachedInfo && latestVersion && util_1.assertDefined(cachedInfo.versions.get(latestVersion));
    if (!latestVersionInfo || !latestVersionInfo.deprecated) {
        log(`Version info not cached for ${pkg.desc}`);
        // Since we're deprecating this package, it should have been published at least once before, so assertDefined.
        const info = util_1.assertDefined(await client.fetchAndCacheNpmInfo(pkg.fullEscapedNpmName));
        latestVersion = util_1.assertDefined(info.distTags.get("latest"));
        latestVersionInfo = util_1.assertDefined(info.versions.get(latestVersion));
    }
    return !!latestVersionInfo.deprecated;
}
/** For use by publish-registry only. */
async function fetchAndProcessNpmInfo(escapedPackageName, client) {
    const info = util_1.assertDefined(await client.fetchNpmInfo(escapedPackageName));
    const version = Semver.parse(util_1.assertDefined(info.distTags.get("latest")));
    const { distTags, versions, timeModified } = info;
    const highestSemverVersion = getLatestVersion(versions.keys());
    assert.strictEqual(highestSemverVersion.versionString, distTags.get("next"));
    const contentHash = versions.get(version.versionString).typesPublisherContentHash || "";
    return { version, highestSemverVersion, contentHash, lastModified: new Date(timeModified) };
}
exports.fetchAndProcessNpmInfo = fetchAndProcessNpmInfo;
function getLatestVersion(versions) {
    return util_1.best(util_1.mapDefined(versions, v => Semver.tryParse(v)), (a, b) => a.greaterThan(b));
}
function getHighestVersionForMajor(versions, { major, minor }) {
    const patch = latestPatchMatchingMajorAndMinor(versions.keys(), major, minor);
    return patch === undefined ? undefined : new Semver(major, minor, patch);
}
/** Finds the version with matching major/minor with the latest patch version. */
function latestPatchMatchingMajorAndMinor(versions, newMajor, newMinor) {
    const versionsWithTypings = util_1.mapDefined(versions, v => {
        const semver = Semver.tryParse(v);
        if (!semver) {
            return undefined;
        }
        const { major, minor, patch } = semver;
        return major === newMajor && minor === newMinor ? patch : undefined;
    });
    return util_1.best(versionsWithTypings, (a, b) => a > b);
}
//# sourceMappingURL=versions.js.map