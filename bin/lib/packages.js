"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const definitelytyped_header_parser_1 = require("definitelytyped-header-parser");
const util_1 = require("../util/util");
const common_1 = require("./common");
const settings_1 = require("./settings");
const versions_1 = require("./versions");
class AllPackages {
    constructor(data, notNeeded) {
        this.data = data;
        this.notNeeded = notNeeded;
    }
    static async read(dt) {
        return AllPackages.from(await readTypesDataFile(), await readNotNeededPackages(dt));
    }
    static from(data, notNeeded) {
        return new AllPackages(util_1.mapValues(new Map(Object.entries(data)), raw => new TypingsVersions(raw)), notNeeded);
    }
    static async readTypings() {
        return AllPackages.from(await readTypesDataFile(), []).allTypings();
    }
    static async readLatestTypings() {
        return AllPackages.from(await readTypesDataFile(), []).allLatestTypings();
    }
    /** Use for `--single` tasks only. Do *not* call this in a loop! */
    static async readSingle(name) {
        const data = await readTypesDataFile();
        const raw = data[name];
        if (!raw) {
            throw new Error(`Can't find package ${name}`);
        }
        const versions = Object.keys(raw);
        if (versions.length > 1) {
            throw new Error(`Package ${name} has multiple versions.`);
        }
        return new TypingsData(raw[versions[0]], /*isLatest*/ true);
    }
    static async readSingleNotNeeded(name, dt) {
        const notNeeded = await readNotNeededPackages(dt);
        const pkg = notNeeded.find(p => p.name === name);
        if (pkg === undefined) {
            throw new Error(`Cannot find not-needed package ${name}`);
        }
        return pkg;
    }
    getNotNeededPackage(name) {
        return this.notNeeded.find(p => p.name === name);
    }
    hasTypingFor(dep) {
        return this.tryGetTypingsData(dep) !== undefined;
    }
    tryResolve(dep) {
        const versions = this.data.get(getMangledNameForScopedPackage(dep.name));
        return versions ? versions.get(dep.majorVersion).id : dep;
    }
    /** Gets the latest version of a package. E.g. getLatest(node v6) was node v10 (before node v11 came out). */
    getLatest(pkg) {
        return pkg.isLatest ? pkg : this.getLatestVersion(pkg.name);
    }
    getLatestVersion(packageName) {
        const latest = this.tryGetLatestVersion(packageName);
        if (!latest) {
            throw new Error(`No such package ${packageName}.`);
        }
        return latest;
    }
    tryGetLatestVersion(packageName) {
        const versions = this.data.get(getMangledNameForScopedPackage(packageName));
        return versions && versions.getLatest();
    }
    getTypingsData(id) {
        const pkg = this.tryGetTypingsData(id);
        if (!pkg) {
            throw new Error(`No typings available for ${JSON.stringify(id)}`);
        }
        return pkg;
    }
    tryGetTypingsData({ name, majorVersion }) {
        const versions = this.data.get(getMangledNameForScopedPackage(name));
        return versions && versions.tryGet(majorVersion);
    }
    allPackages() {
        return [...this.allTypings(), ...this.allNotNeeded()];
    }
    /** Note: this includes older version directories (`foo/v0`) */
    allTypings() {
        return util_1.assertSorted(Array.from(flattenData(this.data)), t => t.name);
    }
    allLatestTypings() {
        return util_1.assertSorted(Array.from(this.data.values()).map(versions => versions.getLatest()), t => t.name);
    }
    allNotNeeded() {
        return this.notNeeded;
    }
    /** Returns all of the dependences *that have typings*, ignoring others, and including test dependencies. */
    *allDependencyTypings(pkg) {
        for (const { name, majorVersion } of pkg.dependencies) {
            const versions = this.data.get(getMangledNameForScopedPackage(name));
            if (versions) {
                yield versions.get(majorVersion);
            }
        }
        for (const name of pkg.testDependencies) {
            const versions = this.data.get(getMangledNameForScopedPackage(name));
            if (versions) {
                yield versions.getLatest();
            }
        }
    }
}
exports.AllPackages = AllPackages;
// Same as the function in moduleNameResolver.ts in typescript
function getMangledNameForScopedPackage(packageName) {
    if (packageName.startsWith("@")) {
        const replaceSlash = packageName.replace("/", "__");
        if (replaceSlash !== packageName) {
            return replaceSlash.slice(1); // Take off the "@"
        }
    }
    return packageName;
}
exports.getMangledNameForScopedPackage = getMangledNameForScopedPackage;
exports.typesDataFilename = "definitions.json";
function* flattenData(data) {
    for (const versions of data.values()) {
        yield* versions.getAll();
    }
}
/** Prefer to use `AnyPackage` instead of this. */
class PackageBase {
    static compare(a, b) { return a.name.localeCompare(b.name); }
    get unescapedName() {
        return util_1.unmangleScopedPackage(this.name) || this.name;
    }
    /** Short description for debug output. */
    get desc() {
        return this.isLatest ? this.name : `${this.name} v${this.major}`;
    }
    constructor(data) {
        this.name = data.typingsPackageName;
        this.libraryName = data.libraryName;
    }
    isNotNeeded() {
        return this instanceof NotNeededPackage;
    }
    /** '@types/foo' for a package 'foo'. */
    get fullNpmName() {
        return getFullNpmName(this.name);
    }
    /** '@types%2ffoo' for a package 'foo'. */
    get fullEscapedNpmName() {
        return `@${settings_1.scopeName}%2f${this.name}`;
    }
    get id() {
        return { name: this.name, majorVersion: this.major };
    }
    get outputDirectory() {
        return util_1.joinPaths(settings_1.outputDirPath, this.desc);
    }
}
exports.PackageBase = PackageBase;
function getFullNpmName(packageName) {
    return `@${settings_1.scopeName}/${getMangledNameForScopedPackage(packageName)}`;
}
exports.getFullNpmName = getFullNpmName;
class NotNeededPackage extends PackageBase {
    get license() { return "MIT" /* MIT */; }
    constructor(raw) {
        super(raw);
        this.sourceRepoURL = raw.sourceRepoURL;
        for (const key in raw) {
            if (!["libraryName", "typingsPackageName", "sourceRepoURL", "asOfVersion"].includes(key)) {
                throw new Error(`Unexpected key in not-needed package: ${key}`);
            }
        }
        assert(raw.libraryName && raw.typingsPackageName && raw.sourceRepoURL && raw.asOfVersion);
        this.version = versions_1.Semver.parse(raw.asOfVersion);
    }
    get major() { return this.version.major; }
    get minor() { return this.version.minor; }
    // A not-needed package has no other versions. (TODO: allow that?)
    get isLatest() { return true; }
    get projectName() { return this.sourceRepoURL; }
    get declaredModules() { return []; }
    get globals() { return this.globals; }
    get minTypeScriptVersion() { return definitelytyped_header_parser_1.TypeScriptVersion.lowest; }
    readme() {
        return `This is a stub types definition for ${this.libraryName} (${this.sourceRepoURL}).\n
${this.libraryName} provides its own type definitions, so you don't need ${getFullNpmName(this.name)} installed!`;
    }
    deprecatedMessage() {
        return `This is a stub types definition. ${this.name} provides its own type definitions, so you do not need this installed.`;
    }
}
exports.NotNeededPackage = NotNeededPackage;
const allLicenses = ["MIT" /* MIT */, "Apache-2.0" /* Apache20 */];
function getLicenseFromPackageJson(packageJsonLicense) {
    if (packageJsonLicense === undefined) { // tslint:disable-line strict-type-predicates (false positive)
        return "MIT" /* MIT */;
    }
    if (packageJsonLicense === "MIT") {
        throw new Error(`Specifying '"license": "MIT"' is redundant, this is the default.`);
    }
    if (allLicenses.includes(packageJsonLicense)) {
        return packageJsonLicense;
    }
    throw new Error(`'package.json' license is ${JSON.stringify(packageJsonLicense)}.\nExpected one of: ${JSON.stringify(allLicenses)}}`);
}
exports.getLicenseFromPackageJson = getLicenseFromPackageJson;
class TypingsVersions {
    constructor(data) {
        const versions = Object.keys(data).map(Number);
        this.latest = Math.max(...versions);
        this.map = new Map(versions.map((version) => [version, new TypingsData(data[version], version === this.latest)]));
    }
    /**
     * Values are reversed so that we publish the current version first.
     * This is important because older versions repeatedly reset the "latest" tag to the current version.
     */
    getAll() {
        return Array.from(this.map.values()).reverse();
    }
    get(majorVersion) {
        return majorVersion === "*" ? this.getLatest() : this.getExact(majorVersion);
    }
    tryGet(majorVersion) {
        return majorVersion === "*" ? this.getLatest() : this.tryGetExact(majorVersion);
    }
    getLatest() {
        return this.getExact(this.latest);
    }
    getExact(majorVersion) {
        const data = this.tryGetExact(majorVersion);
        if (!data) {
            throw new Error(`Could not find version ${majorVersion}`);
        }
        return data;
    }
    tryGetExact(majorVersion) {
        return this.map.get(majorVersion);
    }
}
class TypingsData extends PackageBase {
    constructor(data, isLatest) {
        super(data);
        this.data = data;
        this.isLatest = isLatest;
    }
    get testDependencies() { return this.data.testDependencies; }
    get contributors() { return this.data.contributors; }
    get major() { return this.data.libraryMajorVersion; }
    get minor() { return this.data.libraryMinorVersion; }
    get minTypeScriptVersion() { return this.data.minTsVersion; }
    get typesVersions() { return this.data.typesVersions; }
    get files() { return this.data.files; }
    get license() { return this.data.license; }
    get packageJsonDependencies() { return this.data.packageJsonDependencies; }
    get contentHash() { return this.data.contentHash; }
    get declaredModules() { return this.data.declaredModules; }
    get projectName() { return this.data.projectName; }
    get globals() { return this.data.globals; }
    get pathMappings() { return this.data.pathMappings; }
    get dependencies() {
        return this.data.dependencies;
    }
    /** Path to this package, *relative* to the DefinitelyTyped directory. */
    get subDirectoryPath() {
        return this.isLatest ? this.name : `${this.name}/v${this.data.libraryMajorVersion}`;
    }
}
exports.TypingsData = TypingsData;
function readTypesDataFile() {
    return common_1.readDataFile("parse-definitions", exports.typesDataFilename);
}
async function readNotNeededPackages(dt) {
    const rawJson = await dt.readJson("notNeededPackages.json"); // tslint:disable-line await-promise (tslint bug)
    return rawJson.packages.map(raw => new NotNeededPackage(raw));
}
exports.readNotNeededPackages = readNotNeededPackages;
//# sourceMappingURL=packages.js.map