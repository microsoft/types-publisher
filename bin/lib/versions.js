"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util/util");
const common_1 = require("./common");
exports.versionsFilename = "versions.json";
async function readChangedPackages(allPackages) {
    const json = await common_1.readDataFile("calculate-versions", exports.versionsFilename);
    return {
        changedTypings: json.changedTypings.map(({ id, version, latestVersion }) => ({ pkg: allPackages.getTypingsData(id), version, latestVersion })),
        changedNotNeededPackages: json.changedNotNeededPackages.map(id => util_1.assertDefined(allPackages.getNotNeededPackage(id))),
    };
}
exports.readChangedPackages = readChangedPackages;
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
//# sourceMappingURL=versions.js.map