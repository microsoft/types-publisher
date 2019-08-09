import { AllPackages, TypingsData, PackageId } from "../lib/packages";
export interface Affected {
    readonly changedPackages: ReadonlyArray<TypingsData>;
    readonly dependentPackages: ReadonlyArray<TypingsData>;
}
/** Gets all packages that have changed on this branch, plus all packages affected by the change. */
export declare function getAffectedPackages(allPackages: AllPackages, changedPackageIds: PackageId[]): Affected;
/** Every package name in the original list, plus their dependencies (incl. dependencies' dependencies). */
export declare function allDependencies(allPackages: AllPackages, packages: Iterable<TypingsData>): TypingsData[];
