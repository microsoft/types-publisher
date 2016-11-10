"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require("assert");
const common_1 = require("../lib/common");
const io_1 = require("../util/io");
const util_1 = require("../util/util");
const common_2 = require("./common");
const versionsFilename = "versions.json";
const changesFilename = "version-changes.json";
const additionsFilename = "version-additions.json";
class Versions {
    constructor(data) {
        this.data = data;
    }
    static load() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Versions(yield common_1.readDataFile(versionsFilename));
        });
    }
    static existsSync() {
        return common_1.existsDataFileSync(versionsFilename);
    }
    /**
     * Calculates versions and changed packages by comparing contentHash of parsed packages the NPM registry.
     * `additions` is a subset of `changes`.
     */
    static determineFromNpm({ typings, notNeeded }, log, forceUpdate) {
        return __awaiter(this, void 0, void 0, function* () {
            const changes = [];
            const additions = [];
            const data = {};
            const defaultVersionInfo = { version: { major: -1, minor: -1, patch: -1 }, contentHash: "", deprecated: false };
            yield util_1.nAtATime(25, typings, (pkg) => __awaiter(this, void 0, void 0, function* () {
                const packageName = pkg.typingsPackageName;
                const versionInfo = yield fetchTypesPackageVersionInfo(packageName);
                if (!versionInfo) {
                    log(`Added: ${packageName}`);
                    additions.push(packageName);
                }
                let { version, contentHash, deprecated } = versionInfo || defaultVersionInfo;
                assert(!deprecated, `Package ${packageName} has been deprecated, so we shouldn't have parsed it. Was it re-added?`);
                if (forceUpdate || !versionInfo || pkg.contentHash !== contentHash) {
                    log(`Changed: ${packageName}`);
                    changes.push(packageName);
                    version = updateVersion(version, pkg.libraryMajorVersion, pkg.libraryMinorVersion);
                    contentHash = pkg.contentHash;
                }
                data[packageName] = { version, contentHash, deprecated };
            }));
            yield util_1.nAtATime(25, notNeeded, (pkg) => __awaiter(this, void 0, void 0, function* () {
                const packageName = pkg.typingsPackageName;
                let { version, contentHash, deprecated } = (yield fetchTypesPackageVersionInfo(packageName)) || defaultVersionInfo;
                if (!deprecated) {
                    log(`Now deprecated: ${packageName}`);
                    changes.push(packageName);
                    version = pkg.asOfVersion ? parseSemver(pkg.asOfVersion) : { major: 0, minor: 0, patch: 0 };
                }
                data[packageName] = { version, contentHash, deprecated };
            }));
            // Sort keys so that versions.json is easy to read
            return { changes, additions, versions: new Versions(util_1.sortObjectKeys(data)) };
        });
    }
    save() {
        return common_1.writeDataFile(versionsFilename, this.data);
    }
    versionInfo({ typingsPackageName }) {
        const info = this.data[typingsPackageName];
        if (!info) {
            throw new Error(`No version info for ${typingsPackageName}`);
        }
        return info;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Versions;
function updateVersion(prev, newMajor, newMinor) {
    if (prev.major === newMajor && prev.minor === newMinor) {
        return { major: prev.major, minor: prev.minor, patch: prev.patch + 1 };
    }
    else {
        return { major: newMajor, minor: newMinor, patch: 0 };
    }
}
function versionString(version) {
    return `${version.major}.${version.minor}.${version.patch}`;
}
exports.versionString = versionString;
/** Returns undefined if the package does not exist. */
function fetchTypesPackageVersionInfo(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetchVersionInfoFromNpm(common_2.fullPackageName(packageName).replace(/\//g, "%2f"));
    });
}
function fetchVersionInfoFromNpm(escapedPackageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = common_2.settings.npmRegistry + escapedPackageName;
        const info = yield io_1.fetchJson(uri, { retries: true });
        if (info.error) {
            if (info.error === "Not found") {
                return undefined;
            }
            else {
                throw new Error(`Error getting version at ${uri}: ${info.error}`);
            }
        }
        else if (!info["dist-tags"]) {
            return undefined;
        }
        else {
            const versionSemver = info["dist-tags"].latest;
            assert(typeof versionSemver === "string");
            const latestVersionInfo = info.versions[versionSemver];
            assert(!!latestVersionInfo);
            const contentHash = latestVersionInfo.typesPublisherContentHash || "";
            const deprecated = !!latestVersionInfo.deprecated;
            return { version: parseSemver(versionSemver), contentHash, deprecated };
        }
    });
}
exports.fetchVersionInfoFromNpm = fetchVersionInfoFromNpm;
function parseSemver(semver) {
    // Per the semver spec <http://semver.org/#spec-item-2>:
    // "A normal version number MUST take the form X.Y.Z where X, Y, and Z are non-negative integers, and MUST NOT contain leading zeroes."
    const rgx = /^(\d+)\.(\d+)\.(\d+)$/;
    const match = rgx.exec(semver);
    if (!match) {
        throw new Error(`Unexpected semver: ${semver}`);
    }
    return { major: util_1.intOfString(match[1]), minor: util_1.intOfString(match[2]), patch: util_1.intOfString(match[3]) };
}
/** Read all changed packages. */
function readChanges() {
    return common_1.readDataFile(changesFilename);
}
exports.readChanges = readChanges;
/** Read only packages which are newly added. */
function readAdditions() {
    return common_1.readDataFile(additionsFilename);
}
exports.readAdditions = readAdditions;
function writeChanges(changes, additions) {
    return __awaiter(this, void 0, void 0, function* () {
        yield common_1.writeDataFile(changesFilename, changes);
        yield common_1.writeDataFile(additionsFilename, additions);
    });
}
exports.writeChanges = writeChanges;
function changedPackages(allPackages) {
    return __awaiter(this, void 0, void 0, function* () {
        const changes = yield readChanges();
        return changes.map(changedPackageName => {
            const pkg = allPackages.find(p => p.typingsPackageName === changedPackageName);
            if (pkg === undefined) {
                throw new Error(`Expected to find a package named ${changedPackageName}`);
            }
            return pkg;
        });
    });
}
exports.changedPackages = changedPackages;
//# sourceMappingURL=versions.js.map