import { AllTypeScriptVersion, Author, TypeScriptVersion } from "definitelytyped-header-parser";
import { FS } from "../get-definitely-typed";
import { Semver } from "./versions";
export declare class AllPackages {
    private readonly data;
    private readonly notNeeded;
    static read(dt: FS): Promise<AllPackages>;
    static from(data: TypesDataFile, notNeeded: ReadonlyArray<NotNeededPackage>): AllPackages;
    static readTypings(): Promise<ReadonlyArray<TypingsData>>;
    static readLatestTypings(): Promise<ReadonlyArray<TypingsData>>;
    /** Use for `--single` tasks only. Do *not* call this in a loop! */
    static readSingle(name: string): Promise<TypingsData>;
    static readSingleNotNeeded(name: string, dt: FS): NotNeededPackage;
    private constructor();
    getNotNeededPackage(name: string): NotNeededPackage | undefined;
    hasTypingFor(dep: PackageId): boolean;
    tryResolve(dep: PackageId): PackageId;
    /** Gets the latest version of a package. E.g. getLatest(node v6) was node v10 (before node v11 came out). */
    getLatest(pkg: TypingsData): TypingsData;
    private getLatestVersion;
    tryGetLatestVersion(packageName: string): TypingsData | undefined;
    getTypingsData(id: PackageId): TypingsData;
    tryGetTypingsData({ name, version }: PackageId): TypingsData | undefined;
    allPackages(): ReadonlyArray<AnyPackage>;
    /** Note: this includes older version directories (`foo/v0`) */
    allTypings(): ReadonlyArray<TypingsData>;
    allLatestTypings(): ReadonlyArray<TypingsData>;
    allNotNeeded(): ReadonlyArray<NotNeededPackage>;
    /** Returns all of the dependences *that have typings*, ignoring others, and including test dependencies. */
    allDependencyTypings(pkg: TypingsData): Iterable<TypingsData>;
}
export declare function getMangledNameForScopedPackage(packageName: string): string;
export declare const typesDataFilename = "definitions.json";
export declare type AnyPackage = NotNeededPackage | TypingsData;
interface BaseRaw {
    /**
     * The name of the library.
     *
     * A human readable version, e.g. it might be "Moment.js" even though `packageName` is "moment".
     */
    readonly libraryName: string;
    /**
     * The NPM name to publish this under, e.g. "jquery".
     *
     * This does not include "@types".
     */
    readonly typingsPackageName: string;
}
/** Prefer to use `AnyPackage` instead of this. */
export declare abstract class PackageBase {
    static compare(a: PackageBase, b: PackageBase): number;
    /** Note: for "foo__bar" this is still "foo__bar", not "@foo/bar". */
    readonly name: string;
    readonly libraryName: string;
    get unescapedName(): string;
    /** Short description for debug output. */
    get desc(): string;
    constructor(data: BaseRaw);
    isNotNeeded(): this is NotNeededPackage;
    abstract readonly isLatest: boolean;
    abstract readonly projectName: string;
    abstract readonly declaredModules: ReadonlyArray<string>;
    abstract readonly globals: ReadonlyArray<string>;
    abstract readonly minTypeScriptVersion: TypeScriptVersion;
    /** '@types/foo' for a package 'foo'. */
    get fullNpmName(): string;
    /** '@types%2ffoo' for a package 'foo'. */
    get fullEscapedNpmName(): string;
    abstract readonly major: number;
    abstract readonly minor: number;
    get id(): PackageId;
    get outputDirectory(): string;
}
export declare function getFullNpmName(packageName: string): string;
interface NotNeededPackageRaw extends BaseRaw {
    /**
     * If this is available, @types typings are deprecated as of this version.
     * This is useful for packages that previously had DefinitelyTyped definitions but which now provide their own.
     */
    readonly asOfVersion: string;
    /** The package's own url, *not* DefinitelyTyped's. */
    readonly sourceRepoURL: string;
}
export declare class NotNeededPackage extends PackageBase {
    readonly version: Semver;
    get license(): License.MIT;
    readonly sourceRepoURL: string;
    constructor(raw: NotNeededPackageRaw);
    get major(): number;
    get minor(): number;
    get isLatest(): boolean;
    get projectName(): string;
    get declaredModules(): ReadonlyArray<string>;
    get globals(): ReadonlyArray<string>;
    get minTypeScriptVersion(): TypeScriptVersion;
    readme(): string;
    deprecatedMessage(): string;
}
export interface TypingsVersionsRaw {
    [version: string]: TypingsDataRaw;
}
export interface TypingVersion {
    major: number;
    minor?: number;
}
export declare function formatTypingVersion(version: TypingVersion): string;
/** If no version is specified, uses "*". */
export declare type DependencyVersion = TypingVersion | "*";
export declare function formatDependencyVersion(version: DependencyVersion): string;
export interface PackageJsonDependency {
    readonly name: string;
    readonly version: string;
}
export interface TypingsDataRaw extends BaseRaw {
    /**
     * Other definitions, that exist in the same typings repo, that this package depends on.
     *
     * These will refer to *package names*, not *folder names*.
     */
    readonly dependencies: ReadonlyArray<PackageId>;
    /**
     * Other definitions, that exist in the same typings repo, that the tests, but not the types, of this package depend on.
     *
     * These are always the latest version and will not include anything already in `dependencies`.
     */
    readonly testDependencies: ReadonlyArray<string>;
    /**
     * External packages, from outside the typings repo, that provide definitions that this package depends on.
     */
    readonly packageJsonDependencies: ReadonlyArray<PackageJsonDependency>;
    /**
     * Represents that there was a path mapping to a package.
     *
     * Not all path mappings are direct dependencies, they may be necessary for transitive dependencies. However, where `dependencies` and
     * `pathMappings` share a key, they *must* share the same value.
     */
    readonly pathMappings: ReadonlyArray<PathMapping>;
    /**
     * List of people that have contributed to the definitions in this package.
     *
     * These people will be requested for issue/PR review in the https://github.com/DefinitelyTyped/DefinitelyTyped repo.
     */
    readonly contributors: ReadonlyArray<Author>;
    /**
     * The [older] version of the library that this definition package refers to, as represented *on-disk*.
     *
     * @note The latest version always exists in the root of the package tree and thus does not have a value for this property.
     */
    readonly libraryVersionDirectoryName?: string;
    /**
     * Major version of the library.
     *
     * This data is parsed from a header comment in the entry point `.d.ts` and will be `0` if the file did not specify a version.
     */
    readonly libraryMajorVersion: number;
    /**
     * Minor version of the library.
     *
     * This data is parsed from a header comment in the entry point `.d.ts` and will be `0` if the file did not specify a version.
     */
    readonly libraryMinorVersion: number;
    /**
     * Minimum required TypeScript version to consume the definitions from this package.
     */
    readonly minTsVersion: AllTypeScriptVersion;
    /**
     * List of TS versions that have their own directories, and corresponding "typesVersions" in package.json.
     * Usually empty.
     */
    readonly typesVersions: ReadonlyArray<TypeScriptVersion>;
    /**
     * Files that should be published with this definition, e.g. ["jquery.d.ts", "jquery-extras.d.ts"]
     *
     * Does *not* include a partial `package.json` because that will not be copied directly.
     */
    readonly files: ReadonlyArray<string>;
    /**
     * The license that this definition package is released under.
     *
     * Can be either MIT or Apache v2, defaults to MIT when not explicitly defined in this package’s "package.json".
     */
    readonly license: License;
    /**
     * A hash of the names and contents of the `files` list, used for versioning.
     */
    readonly contentHash: string;
    /**
     * Name or URL of the project, e.g. "http://cordova.apache.org".
     */
    readonly projectName: string;
    /**
     * A list of *values* declared in the global namespace.
     *
     * @note This does not include *types* declared in the global namespace.
     */
    readonly globals: ReadonlyArray<string>;
    /**
     * External modules declared by this package. Includes the containing folder name when applicable (e.g. proper module).
     */
    readonly declaredModules: ReadonlyArray<string>;
}
/**
 * @see {TypingsDataRaw.pathMappings}
 */
export interface PathMapping {
    readonly packageName: string;
    readonly version: TypingVersion;
}
export declare const enum License {
    MIT = "MIT",
    Apache20 = "Apache-2.0"
}
export declare function getLicenseFromPackageJson(packageJsonLicense: unknown): License;
export declare class TypingsVersions {
    private readonly map;
    /**
     * Sorted from latest to oldest.
     */
    private readonly versions;
    constructor(data: TypingsVersionsRaw);
    getAll(): Iterable<TypingsData>;
    get(version: DependencyVersion): TypingsData;
    tryGet(version: DependencyVersion): TypingsData | undefined;
    getLatest(): TypingsData;
    private getLatestMatch;
    private tryGetLatestMatch;
}
export declare class TypingsData extends PackageBase {
    private readonly data;
    readonly isLatest: boolean;
    constructor(data: TypingsDataRaw, isLatest: boolean);
    get testDependencies(): ReadonlyArray<string>;
    get contributors(): ReadonlyArray<Author>;
    get major(): number;
    get minor(): number;
    get minTypeScriptVersion(): TypeScriptVersion;
    get typesVersions(): ReadonlyArray<TypeScriptVersion>;
    get files(): ReadonlyArray<string>;
    get license(): License;
    get packageJsonDependencies(): ReadonlyArray<PackageJsonDependency>;
    get contentHash(): string;
    get declaredModules(): ReadonlyArray<string>;
    get projectName(): string;
    get globals(): ReadonlyArray<string>;
    get pathMappings(): ReadonlyArray<PathMapping>;
    get dependencies(): ReadonlyArray<PackageId>;
    get versionDirectoryName(): string | undefined;
    /** Path to this package, *relative* to the DefinitelyTyped directory. */
    get subDirectoryPath(): string;
}
/** Uniquely identifies a package. */
export interface PackageId {
    readonly name: string;
    readonly version: DependencyVersion;
}
export interface TypesDataFile {
    readonly [packageName: string]: TypingsVersionsRaw;
}
export declare function readNotNeededPackages(dt: FS): ReadonlyArray<NotNeededPackage>;
export {};
