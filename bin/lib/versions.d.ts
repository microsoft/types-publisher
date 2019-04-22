import { Logger } from "../util/logging";
import { AllPackages, NotNeededPackage, PackageId, TypingsData } from "./packages";
import { CachedNpmInfoClient } from "./npm-client";
export declare const versionsFilename = "versions.json";
export interface ChangedTyping {
    readonly pkg: TypingsData;
    /** This is the version to be published, meaning it's the version that doesn't exist yet. */
    readonly version: string;
    /** For a non-latest version, this is the latest version; publishing an old version updates the 'latest' tag and we want to change it back. */
    readonly latestVersion: string | undefined;
}
export interface ChangedPackagesJson {
    readonly changedTypings: ReadonlyArray<ChangedTypingJson>;
    readonly changedNotNeededPackages: ReadonlyArray<string>;
}
export interface ChangedTypingJson {
    readonly id: PackageId;
    readonly version: string;
    readonly latestVersion?: string;
}
export interface ChangedPackages {
    readonly changedTypings: ReadonlyArray<ChangedTyping>;
    readonly changedNotNeededPackages: ReadonlyArray<NotNeededPackage>;
}
export declare function readChangedPackages(allPackages: AllPackages): Promise<ChangedPackages>;
/**
 * When we fail to publish a deprecated package, it leaves behind an entry in the time property.
 * So the keys of 'time' give the actual 'latest'.
 * If that's not equal to the expected latest, try again by bumping the patch version of the last attempt by 1.
 */
export declare function skipBadPublishes(pkg: NotNeededPackage, client: CachedNpmInfoClient, log: Logger): NotNeededPackage;
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
