"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util/util");
const common_1 = require("./common");
const packages_1 = require("./packages");
exports.versionsFilename = "versions.json";
async function readChangedPackages(allPackages) {
    const json = await common_1.readDataFile("calculate-versions", exports.versionsFilename);
    return {
        changedTypings: json.changedTypings.map(({ id, version, latestVersion }) => ({ pkg: allPackages.getTypingsData(id), version, latestVersion })),
        changedNotNeededPackages: json.changedNotNeededPackages.map(id => util_1.assertDefined(allPackages.getNotNeededPackage(id))),
    };
}
exports.readChangedPackages = readChangedPackages;
/**
 * When we fail to publish a deprecated package, it leaves behind an entry in the time property.
 * So the keys of 'time' give the actual 'latest'.
 * If that's not equal to the expected latest, try again by bumping the patch version of the last attempt by 1.
 */
function skipBadPublishes(pkg, client, log) {
    // because this is called right after isAlreadyDeprecated, we can rely on the cache being up-to-date
    const info = util_1.assertDefined(client.getNpmInfoFromCache(pkg.fullEscapedNpmName));
    const notNeeded = pkg.version;
    const latest = Semver.parse(findActualLatest(info.time));
    if (latest.equals(notNeeded) || latest.greaterThan(notNeeded) ||
        info.versions.has(notNeeded.versionString) && !util_1.assertDefined(info.versions.get(notNeeded.versionString)).deprecated) {
        const plusOne = new Semver(latest.major, latest.minor, latest.patch + 1);
        log(`Deprecation of ${notNeeded.versionString} failed, instead using ${plusOne.versionString}.`);
        return new packages_1.NotNeededPackage({
            asOfVersion: plusOne.versionString,
            libraryName: pkg.libraryName,
            sourceRepoURL: pkg.sourceRepoURL,
            typingsPackageName: pkg.name,
        });
    }
    return pkg;
}
exports.skipBadPublishes = skipBadPublishes;
function findActualLatest(times) {
    const actual = util_1.best(times, ([k, v], [bestK, bestV]) => (bestK === "modified" || bestK === "created") ? true :
        (k === "modified" || k === "created") ? false :
            new Date(v) > new Date(bestV));
    if (!actual) {
        throw new Error("failed to find actual latest");
    }
    return actual[0];
}
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