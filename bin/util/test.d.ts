import { PackageId, TypingsVersionsRaw } from "../lib/packages";
export declare function testo(o: {
    [s: string]: () => void;
}): void;
export declare function createTypingsVersionRaw(name: string, dependencies: PackageId[], testDependencies: string[]): TypingsVersionsRaw;
