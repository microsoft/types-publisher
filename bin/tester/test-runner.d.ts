import { FS } from "../get-definitely-typed";
import { TesterOptions } from "../lib/common";
import { AllPackages, PackageId, NotNeededPackage } from "../lib/packages";
import { NpmInfo } from "../lib/npm-client";
import { Logger } from "../util/logging";
export interface GitDiff {
    status: "A" | "D" | "M";
    file: string;
}
export declare function parseNProcesses(): number;
export declare function testerOptions(runFromDefinitelyTyped: boolean): TesterOptions;
export default function runTests(dt: FS, definitelyTypedPath: string, nProcesses: number, selection: "all" | "affected" | RegExp): Promise<void>;
/**
 * 1. find all the deleted files and group by toplevel
 * 2. Make sure that there are no packages left with deleted entries
 * 3. make sure that each toplevel deleted has a matching entry in notNeededPackages
 */
export declare function getNotNeededPackages(allPackages: AllPackages, diffs: GitDiff[]): Iterable<NotNeededPackage>;
/**
 * 1. libraryName must exist on npm (SKIPPED and preferably/optionally have been the libraryName in just-deleted header)
 * (SKIPPED 2.) sourceRepoURL must exist and be the npm homepage
 * 3. asOfVersion must be newer than `@types/name@latest` on npm
 * 4. `name@asOfVersion` must exist on npm
 *
 * I skipped (2) because the cached npm info doesn't include it. I might add it later.
 */
export declare function checkNotNeededPackage(unneeded: NotNeededPackage, source: NpmInfo | undefined, typings: NpmInfo | undefined): void;
/** Returns all immediate subdirectories of the root directory that have changed. */
export declare function gitChanges(diffs: GitDiff[]): PackageId[];
export declare function gitDiff(log: Logger, definitelyTypedPath: string): Promise<GitDiff[]>;
