import { FS } from "../get-definitely-typed";
import { TesterOptions } from "../lib/common";
import { AllPackages, PackageId } from "../lib/packages";
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
export declare function checkDeletedFiles(allPackages: AllPackages, diffs: GitDiff[]): Set<string>;
/** Returns all immediate subdirectories of the root directory that have changed. */
export declare function gitChanges(diffs: GitDiff[]): PackageId[];
export declare function gitDiff(log: Logger, definitelyTypedPath: string): Promise<GitDiff[]>;
