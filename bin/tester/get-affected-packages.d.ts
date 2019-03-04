import { AllPackages, TypingsData, PackageId } from "../lib/packages";
import { Logger } from "../util/logging";
export interface Affected {
    readonly changedPackages: ReadonlyArray<TypingsData>;
    readonly dependentPackages: ReadonlyArray<TypingsData>;
}
/** Gets all packages that have changed on this branch, plus all packages affected by the change. */
export default function getAffectedPackages(allPackages: AllPackages, changedPackageIds: PackageId[]): Affected;
/** Every package name in the original list, plus their dependencies (incl. dependencies' dependencies). */
export declare function allDependencies(allPackages: AllPackages, packages: Iterable<TypingsData>): TypingsData[];
/** Returns all immediate subdirectories of the root directory that have changed. */
export declare function gitChanges(log: Logger, definitelyTypedPath: string): Promise<Array<PackageId>>;
