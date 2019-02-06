import { LoggerWithErrors } from "../util/logging";
import { CachedNpmInfoClient, UncachedNpmInfoClient } from "./npm-client";
import { AllPackages, NotNeededPackage, TypingsData } from "./packages";
export interface ChangedTyping {
    readonly pkg: TypingsData;
    /** This is the version to be published, meaning it's the version that doesn't exist yet. */
    readonly version: string;
    /** For a non-latest version, this is the latest version; publishing an old version updates the 'latest' tag and we want to change it back. */
    readonly latestVersion: string | undefined;
}
export declare function readChangedPackages(allPackages: AllPackages): Promise<ChangedPackages>;
export interface ChangedPackages {
    readonly changedTypings: ReadonlyArray<ChangedTyping>;
    readonly changedNotNeededPackages: ReadonlyArray<NotNeededPackage>;
}
export declare function computeAndSaveChangedPackages(allPackages: AllPackages, log: LoggerWithErrors, client: CachedNpmInfoClient): Promise<ChangedPackages>;
export declare function getLatestTypingVersion(pkg: TypingsData, client: CachedNpmInfoClient): Promise<string>;
/** Version of a package published to NPM. */
export declare class Semver {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    static parse(semver: string): Semver;
    static fromRaw({ major, minor, patch }: Semver): Semver;
    static tryParse(semver: string): Semver | undefined;
    constructor(major: number, minor: number, patch: number);
    readonly versionString: string;
    equals(sem: Semver): boolean;
    greaterThan(sem: Semver): boolean;
}
export interface ProcessedNpmInfo {
    readonly version: Semver;
    readonly highestSemverVersion: Semver;
    readonly contentHash: string;
    readonly lastModified: Date;
}
/** For use by publish-registry only. */
export declare function fetchAndProcessNpmInfo(escapedPackageName: string, client: UncachedNpmInfoClient): Promise<ProcessedNpmInfo>;
