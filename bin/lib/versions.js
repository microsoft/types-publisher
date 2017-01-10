"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const assert = require("assert");
const io_1 = require("../util/io");
const util_1 = require("../util/util");
const common_1 = require("./common");
const packages_1 = require("./packages");
const settings_1 = require("./settings");
const versionsFilename = "versions.json";
const changesFilename = "version-changes.json";
const additionsFilename = "version-additions.json";
class Versions {
    constructor(data) {
        this.data = data;
    }
    static load() {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = yield common_1.readDataFile("calculate-versions", versionsFilename);
            for (const packageName in raw) {
                const majorVersions = raw[packageName];
                for (const majorVersion in majorVersions) {
                    const info = majorVersions[majorVersion];
                    info.version = Semver.fromRaw(info.version);
                    if (info.latestNonPrerelease) {
                        info.latestNonPrerelease = Semver.fromRaw(info.latestNonPrerelease);
                    }
                }
            }
            return new Versions(raw);
        });
    }
    /**
     * Calculates versions and changed packages by comparing contentHash of parsed packages the NPM registry.
     * `additions` is a subset of `changes`.
     */
    static determineFromNpm(allPackages, log, forceUpdate, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const changes = [];
            const additions = [];
            const data = {};
            yield util_1.nAtATime(25, allPackages.allTypings(), getTypingsVersion, { name: "Versions for typings", flavor, options });
            function getTypingsVersion(pkg) {
                return __awaiter(this, void 0, void 0, function* () {
                    const isPrerelease = packages_1.TypeScriptVersion.isPrerelease(pkg.typeScriptVersion);
                    const versionInfo = yield fetchTypesPackageVersionInfo(pkg, isPrerelease, pkg.majorMinor);
                    if (!versionInfo) {
                        log(`Added: ${pkg.desc}`);
                        additions.push(pkg.id);
                    }
                    // tslint:disable-next-line:prefer-const
                    let { version, latestNonPrerelease, contentHash, deprecated } = versionInfo || defaultVersionInfo(isPrerelease);
                    assert(!deprecated, `Package ${pkg.name} has been deprecated, so we shouldn't have parsed it. Was it re-added?`);
                    if (forceUpdate || !versionInfo || pkg.major !== version.major || pkg.minor !== version.minor || pkg.contentHash !== contentHash) {
                        log(`Changed: ${pkg.desc}`);
                        changes.push(pkg.id);
                        version = version.update(pkg.majorMinor, isPrerelease);
                        contentHash = pkg.contentHash;
                    }
                    addToData(pkg.name, version, latestNonPrerelease, contentHash, deprecated);
                });
            }
            yield util_1.nAtATime(25, allPackages.allNotNeeded(), getNotNeededVersion, { name: "Versions for not-needed packages...", flavor, options });
            function getNotNeededVersion(pkg) {
                return __awaiter(this, void 0, void 0, function* () {
                    const isPrerelease = false; // Not-needed packages are never prerelease.
                    // tslint:disable-next-line:prefer-const
                    let { version, contentHash, deprecated } = (yield fetchTypesPackageVersionInfo(pkg, isPrerelease)) || defaultVersionInfo(isPrerelease);
                    if (!deprecated) {
                        log(`Now deprecated: ${pkg.name}`);
                        changes.push({ name: pkg.name, majorVersion: version.major });
                        version = pkg.version;
                    }
                    addToData(pkg.name, version, /*latestNonPrerelease*/ undefined, contentHash, deprecated);
                });
            }
            function flavor(pkg) { return pkg.desc; }
            // Sort keys so that versions.json is easy to read
            return { changes, additions, versions: new Versions(util_1.sortObjectKeys(data)) };
            function defaultVersionInfo(isPrerelease) {
                return { version: new Semver(-1, -1, -1, isPrerelease), latestNonPrerelease: undefined, contentHash: "", deprecated: false };
            }
            function addToData(packageName, version, latestNonPrerelease, contentHash, deprecated) {
                const info = { version, contentHash, deprecated };
                if (latestNonPrerelease) {
                    info.latestNonPrerelease = latestNonPrerelease;
                }
                let majorVersions = data[packageName];
                if (!majorVersions) {
                    majorVersions = data[packageName] = {};
                }
                assert(!majorVersions[version.major]);
                majorVersions[version.major] = info;
            }
        });
    }
    save() {
        return common_1.writeDataFile(versionsFilename, this.data);
    }
    getVersion(id) {
        return this.info(id).version;
    }
    latestNonPrerelease(id) {
        return this.info(id).latestNonPrerelease;
    }
    info({ name, majorVersion }) {
        const info = this.data[name][majorVersion];
        if (!info) {
            throw new Error(`No version info for ${name}@${majorVersion}`);
        }
        return info;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Versions;
function changedPackages(allPackages) {
    return __awaiter(this, void 0, void 0, function* () {
        const changes = yield readChanges();
        return changes.map(changedPackageName => allPackages.getAnyPackage(changedPackageName));
    });
}
exports.changedPackages = changedPackages;
/** Version of a package published to NPM. */
class Semver {
    constructor(major, minor, patch, 
        /**
         * If true, this is `major.minor.0-next.patch`.
         * If false, this is `major.minor.patch`.
         */
        isPrerelease) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
        this.isPrerelease = isPrerelease;
    }
    static parse(semver, isPrerelease) {
        const result = Semver.tryParse(semver, isPrerelease);
        if (!result) {
            throw new Error(`Unexpected semver: ${semver} (isPrerelease: ${isPrerelease})`);
        }
        return result;
    }
    static fromRaw({ major, minor, patch, isPrerelease }) {
        return new Semver(major, minor, patch, isPrerelease);
    }
    // This must parse the output of `versionString`.
    static tryParse(semver, isPrerelease) {
        // Per the semver spec <http://semver.org/#spec-item-2>:
        // "A normal version number MUST take the form X.Y.Z where X, Y, and Z are non-negative integers, and MUST NOT contain leading zeroes."
        const rgx = isPrerelease ? /^(\d+)\.(\d+)\.0-next.(\d+)$/ : /^(\d+)\.(\d+)\.(\d+)$/;
        const match = rgx.exec(semver);
        return match ? new Semver(util_1.intOfString(match[1]), util_1.intOfString(match[2]), util_1.intOfString(match[3]), isPrerelease) : undefined;
    }
    get versionString() {
        const { isPrerelease, major, minor, patch } = this;
        return isPrerelease ? `${major}.${minor}.0-next.${patch}` : `${major}.${minor}.${patch}`;
    }
    update({ major, minor }, isPrerelease) {
        const patch = this.major === major && this.minor === minor && this.isPrerelease === isPrerelease ? this.patch + 1 : 0;
        return new Semver(major, minor, patch, isPrerelease);
    }
}
exports.Semver = Semver;
/** Returns undefined if the package does not exist. */
function fetchTypesPackageVersionInfo(pkg, isPrerelease, newMajorAndMinor) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetchVersionInfoFromNpm(pkg.fullEscapedNpmName, isPrerelease, newMajorAndMinor);
    });
}
/** For use by publish-registry only. */
function fetchLastPatchNumber(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield fetchVersionInfoFromNpm(packageName, /*isPrerelease*/ false)).version.patch;
    });
}
exports.fetchLastPatchNumber = fetchLastPatchNumber;
function fetchVersionInfoFromNpm(escapedPackageName, isPrerelease, newMajorAndMinor) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = settings_1.npmRegistry + escapedPackageName;
        const info = yield io_1.fetchJson(uri, { retries: true });
        if (info.error) {
            throw new Error(`Error getting version at ${uri}: ${info.error}`);
        }
        else if (!info["dist-tags"]) {
            // NPM returns `{}` for missing packages.
            return undefined;
        }
        else {
            const versions = info.versions;
            const latestNonPrerelease = !isPrerelease ? undefined : util_1.best(Object.keys(versions).map(parseAnySemver), (a, b) => {
                if (a.isPrerelease && !b.isPrerelease) {
                    return false;
                }
                if (!a.isPrerelease && b.isPrerelease) {
                    return true;
                }
                return a.major >= b.major && a.minor >= b.minor && a.patch > b.patch;
            });
            const version = getVersionSemver(info, isPrerelease, newMajorAndMinor);
            const latestVersionInfo = versions[version.versionString];
            assert(!!latestVersionInfo);
            const contentHash = latestVersionInfo.typesPublisherContentHash || "";
            const deprecated = !!latestVersionInfo.deprecated;
            return { version, latestNonPrerelease, contentHash, deprecated };
        }
    });
}
function getVersionSemver(info, isPrerelease, newMajorAndMinor) {
    // If there's already a published package with this version, look for that first.
    if (newMajorAndMinor) {
        const { major, minor } = newMajorAndMinor;
        const patch = latestPatchMatchingMajorAndMinor(info.versions, major, minor, isPrerelease);
        if (patch !== undefined) {
            return new Semver(major, minor, patch, isPrerelease);
        }
    }
    // Usually latest version should never be a prerelease, but it may if we've only ever published prerelease versions.
    return parseAnySemver(info["dist-tags"].latest);
}
/** Parse a semver that may not follow X.Y.Z format perfectly. */
function parseAnySemver(s) {
    // Once upon a time we published -alpha versions.
    const alpha = /^(.*)-alpha/.exec(s);
    if (alpha) {
        return Semver.parse(alpha[1], /*isPrerelase*/ false);
    }
    else if (/^(.*)-next.\d+/.test(s)) {
        return Semver.parse(s, /*isPrerelease*/ true);
    }
    else {
        return Semver.parse(s, /*isPrerelease*/ false);
    }
}
/** Finds the version with matching major/minor with the latest patch version. */
function latestPatchMatchingMajorAndMinor(versions, newMajor, newMinor, isPrerelease) {
    const versionsWithTypings = Object.keys(versions).map(v => {
        const semver = Semver.tryParse(v, isPrerelease);
        if (!semver) {
            return undefined;
        }
        const { major, minor, patch } = semver;
        return major === newMajor && minor === newMinor ? patch : undefined;
    }).filter(x => x !== undefined);
    return util_1.best(versionsWithTypings, (a, b) => a > b);
}
/** Read all changed packages. */
function readChanges() {
    return common_1.readDataFile("calculate-versions", changesFilename);
}
exports.readChanges = readChanges;
/** Read only packages which are newly added. */
function readAdditions() {
    return common_1.readDataFile("calculate-versions", additionsFilename);
}
exports.readAdditions = readAdditions;
function writeChanges(changes, additions) {
    return __awaiter(this, void 0, void 0, function* () {
        yield common_1.writeDataFile(changesFilename, changes);
        yield common_1.writeDataFile(additionsFilename, additions);
    });
}
exports.writeChanges = writeChanges;
//# sourceMappingURL=versions.js.map