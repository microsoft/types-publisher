import { Logger } from "../util/logging";
import { CachedNpmInfoClient } from "./npm-client";
import { AllPackages, NotNeededPackage, PackageId, TypingsData } from "./packages";
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
    static parse(semver: string, coerce?: boolean): Semver;
    static fromRaw({ major, minor, patch }: Semver): Semver;
    /**
     * Per the semver spec <http://semver.org/#spec-item-2>:
     *
     *   A normal version number MUST take the form X.Y.Z where X, Y, and Z are non-negative integers, and MUST NOT contain leading zeroes.
     *
     * @note This must parse the output of `versionString`.
     *
     * @param semver The version string.
     * @param coerce Without this optional parameter the version MUST follow the above semver spec. However, when set to `true` components after the
     *               major version may be omitted. I.e. `1` equals `1.0` and `1.0.0`.
     */
    static tryParse(semver: string, coerce?: boolean): Semver | undefined;
    constructor(major: number, minor: number, patch: number);
    get versionString(): string;
    equals(other: Semver): boolean;
    greaterThan(other: Semver): boolean;
}
/**
 * Returns 0 if equal, 1 if x > y, -1 if x < y
 */
export declare function compare(x: Semver, y: Semver): 1 | 0 | -1;
