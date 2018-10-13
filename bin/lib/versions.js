"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const util_1 = require("../util/util");
const common_1 = require("./common");
const versionsFilename = "versions.json";
const changesFilename = "version-changes.json";
class Versions {
    constructor(data) {
        this.data = data;
    }
    static async load() {
        const raw = await common_1.readDataFile("calculate-versions", versionsFilename);
        for (const packageName in raw) {
            const majorVersions = raw[packageName];
            for (const majorVersion in majorVersions) {
                const info = majorVersions[majorVersion];
                if (info.latestNonPrerelease) {
                    info.latestNonPrerelease = Semver.fromRaw(info.latestNonPrerelease);
                }
            }
        }
        return new Versions(raw);
    }
    /**
     * Calculates versions and changed packages by comparing contentHash of parsed packages the NPM registry.
     */
    static async determineFromNpm(allPackages, log, forceUpdate, client) {
        const changes = [];
        const data = {};
        for (const pkg of allPackages.allTypings()) {
            const versionInfo = await fetchTypesPackageVersionInfo(pkg, client, pkg.majorMinor);
            if (!versionInfo) {
                log(`Added: ${pkg.desc}`);
            }
            // tslint:disable-next-line:prefer-const
            let { version, contentHash, deprecated } = versionInfo || defaultVersionInfo;
            if (deprecated) {
                // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/22306
                assert(pkg.name === "angular-ui-router" || pkg.name === "ui-router-extras", `Package ${pkg.name} has been deprecated, so we shouldn't have parsed it. Was it re-added?`);
            }
            if (forceUpdate || !versionInfo || pkg.major !== version.major || pkg.minor !== version.minor || pkg.contentHash !== contentHash) {
                log(`Changed: ${pkg.desc}`);
                changes.push(pkg.id);
                version = version.update(pkg.majorMinor);
            }
            addToData(pkg.name, version);
        }
        for (const pkg of allPackages.allNotNeeded()) {
            // tslint:disable-next-line:prefer-const
            let { version, deprecated } = await fetchTypesPackageVersionInfo(pkg, client) || defaultVersionInfo;
            if (!deprecated) {
                log(`Now deprecated: ${pkg.name}`);
                changes.push({ name: pkg.name, majorVersion: version.major });
                version = pkg.version;
            }
            addToData(pkg.name, version);
        }
        // Sort keys so that versions.json is easy to read
        return { versions: new Versions(util_1.sortObjectKeys(data)), changes };
        function addToData(packageName, { major, patch }, latestNonPrerelease) {
            let majorVersions = data[packageName];
            if (!majorVersions) {
                majorVersions = data[packageName] = {};
            }
            assert(!majorVersions[major]);
            majorVersions[major] = latestNonPrerelease ? { patch, latestNonPrerelease } : { patch };
        }
    }
    save() {
        return common_1.writeDataFile(versionsFilename, this.data);
    }
    getVersion(pkg) {
        return new Semver(pkg.major, pkg.minor, this.info(pkg.id).patch);
    }
    latestNonPrerelease(pkg) {
        const info = this.info(pkg.id);
        return pkg.isLatest ? this.getVersion(pkg) : util_1.assertDefined(info.latestNonPrerelease);
    }
    info({ name, majorVersion }) {
        const info = this.data[name][majorVersion];
        if (!info) {
            throw new Error(`No version info for ${name}@${majorVersion}`);
        }
        return info;
    }
}
exports.default = Versions;
async function changedPackages(allPackages, changes) {
    return changes.map(changedPackageName => allPackages.getAnyPackage(changedPackageName));
}
exports.changedPackages = changedPackages;
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
    update({ major, minor }) {
        const patch = this.major === major && this.minor === minor ? this.patch + 1 : 0;
        return new Semver(major, minor, patch);
    }
}
exports.Semver = Semver;
const defaultVersionInfo = { version: new Semver(-1, -1, -1), contentHash: "", deprecated: false };
/** Returns undefined if the package does not exist. */
async function fetchTypesPackageVersionInfo(pkg, client, newMajorAndMinor) {
    const info = await client.getNpmInfo(pkg.fullEscapedNpmName, pkg.isNotNeeded() ? undefined : pkg.contentHash);
    if (info === undefined) {
        return undefined;
    }
    const { versions } = info;
    const version = getVersionSemver(info, newMajorAndMinor);
    const latestVersionInfo = util_1.assertDefined(versions.get(version.versionString));
    const contentHash = latestVersionInfo.typesPublisherContentHash || "";
    const deprecated = !!latestVersionInfo.deprecated;
    return { version, contentHash, deprecated };
}
/** For use by publish-registry only. */
async function fetchAndProcessNpmInfo(escapedPackageName, client) {
    const info = util_1.assertDefined(await client.fetchNpmInfo(escapedPackageName));
    const version = getVersionSemver(info);
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
function getVersionSemver(info, newMajorAndMinor) {
    // If there's already a published package with this version, look for that first.
    if (newMajorAndMinor) {
        const { major, minor } = newMajorAndMinor;
        const patch = latestPatchMatchingMajorAndMinor(info.versions.keys(), major, minor);
        if (patch !== undefined) {
            return new Semver(major, minor, patch);
        }
    }
    return Semver.parse(util_1.assertDefined(info.distTags.get("latest")));
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
async function readVersionsAndChanges() {
    return { versions: await Versions.load(), changes: await readChanges() };
}
exports.readVersionsAndChanges = readVersionsAndChanges;
/** Read all changed packages. */
function readChanges() {
    return common_1.readDataFile("calculate-versions", changesFilename);
}
exports.readChanges = readChanges;
async function writeChanges(changes) {
    await common_1.writeDataFile(changesFilename, changes);
}
exports.writeChanges = writeChanges;
//# sourceMappingURL=versions.js.map