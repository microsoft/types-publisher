import { Author, TypeScriptVersion } from "definitelytyped-header-parser";
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
    static readSingleNotNeeded(name: string, dt: FS): Promise<NotNeededPackage>;
    private constructor();
    getNotNeededPackage(name: string): NotNeededPackage | undefined;
    hasTypingFor(dep: PackageId): boolean;
    tryResolve(dep: PackageId): PackageId;
    /** Gets the latest version of a package. E.g. getLatest(node v6) was node v10 (before node v11 came out). */
    getLatest(pkg: TypingsData): TypingsData;
    private getLatestVersion;
    tryGetLatestVersion(packageName: string): TypingsData | undefined;
    getTypingsData(id: PackageId): TypingsData;
    tryGetTypingsData({ name, majorVersion }: PackageId): TypingsData | undefined;
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
    readonly libraryName: string;
    readonly typingsPackageName: string;
}
/** Prefer to use `AnyPackage` instead of this. */
export declare abstract class PackageBase {
    static compare(a: PackageBase, b: PackageBase): number;
    /** Note: for "foo__bar" this is still "foo__bar", not "@foo/bar". */
    readonly name: string;
    readonly libraryName: string;
    readonly unescapedName: string;
    /** Short description for debug output. */
    readonly desc: string;
    constructor(data: BaseRaw);
    isNotNeeded(): this is NotNeededPackage;
    abstract readonly isLatest: boolean;
    abstract readonly projectName: string;
    abstract readonly declaredModules: ReadonlyArray<string>;
    abstract readonly globals: ReadonlyArray<string>;
    abstract readonly minTypeScriptVersion: TypeScriptVersion;
    /** '@types/foo' for a package 'foo'. */
    readonly fullNpmName: string;
    /** '@types%2ffoo' for a package 'foo'. */
    readonly fullEscapedNpmName: string;
    abstract readonly major: number;
    readonly id: PackageId;
    readonly outputDirectory: string;
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
    readonly license: License.MIT;
    readonly sourceRepoURL: string;
    constructor(raw: NotNeededPackageRaw);
    readonly major: number;
    readonly minor: number;
    readonly isLatest: boolean;
    readonly projectName: string;
    readonly declaredModules: ReadonlyArray<string>;
    readonly globals: ReadonlyArray<string>;
    readonly minTypeScriptVersion: TypeScriptVersion;
    readme(): string;
    deprecatedMessage(): string;
}
export interface TypingsVersionsRaw {
    [version: string]: TypingsDataRaw;
}
/** If no version is specified, uses "*". */
export declare type DependencyVersion = number | "*";
export interface PackageJsonDependency {
    readonly name: string;
    readonly version: string;
}
export interface TypingsDataRaw extends BaseRaw {
    readonly dependencies: ReadonlyArray<PackageId>;
    readonly testDependencies: ReadonlyArray<string>;
    readonly pathMappings: ReadonlyArray<PathMapping>;
    readonly contributors: ReadonlyArray<Author>;
    readonly libraryMajorVersion: number;
    readonly libraryMinorVersion: number;
    readonly minTsVersion: TypeScriptVersion;
    /**
     * List of TS versions that have their own directories, and corresponding "typesVersions" in package.json.
     * Usually empty.
     */
    readonly typesVersions: ReadonlyArray<TypeScriptVersion>;
    readonly files: ReadonlyArray<string>;
    readonly license: License;
    readonly packageJsonDependencies: ReadonlyArray<PackageJsonDependency>;
    readonly contentHash: string;
    readonly projectName: string;
    readonly globals: ReadonlyArray<string>;
    readonly declaredModules: ReadonlyArray<string>;
}
/**
 * Represents that there was a path mapping to a package.
 * Not all path mappings are direct dependencies: They may be necessary for dependencies-of-dependencies.
 * But, where dependencies and pathMappings share a key, they must share the same value
 */
export interface PathMapping {
    readonly packageName: string;
    readonly majorVersion: number;
}
export declare const enum License {
    MIT = "MIT",
    Apache20 = "Apache-2.0"
}
export declare function getLicenseFromPackageJson(packageJsonLicense: unknown): License;
export declare class TypingsData extends PackageBase {
    private readonly data;
    readonly isLatest: boolean;
    constructor(data: TypingsDataRaw, isLatest: boolean);
    readonly testDependencies: ReadonlyArray<string>;
    readonly contributors: ReadonlyArray<Author>;
    readonly major: number;
    readonly minor: number;
    readonly minTypeScriptVersion: TypeScriptVersion;
    readonly typesVersions: ReadonlyArray<TypeScriptVersion>;
    readonly files: ReadonlyArray<string>;
    readonly license: License;
    readonly packageJsonDependencies: ReadonlyArray<PackageJsonDependency>;
    readonly contentHash: string;
    readonly declaredModules: ReadonlyArray<string>;
    readonly projectName: string;
    readonly globals: ReadonlyArray<string>;
    readonly pathMappings: ReadonlyArray<PathMapping>;
    readonly dependencies: ReadonlyArray<PackageId>;
    /** Path to this package, *relative* to the DefinitelyTyped directory. */
    readonly subDirectoryPath: string;
}
/** Uniquely identifies a package. */
export interface PackageId {
    readonly name: string;
    readonly majorVersion: DependencyVersion;
}
export interface TypesDataFile {
    readonly [packageName: string]: TypingsVersionsRaw;
}
export declare function readNotNeededPackages(dt: FS): Promise<ReadonlyArray<NotNeededPackage>>;
export {};
