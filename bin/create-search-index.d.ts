import { UncachedNpmInfoClient } from "./lib/npm-client";
import { AllPackages } from "./lib/packages";
export interface SearchRecord {
    readonly t: string;
    readonly g: ReadonlyArray<string>;
    readonly m: ReadonlyArray<string>;
    readonly p: string;
    readonly l: string;
    readonly d: number;
}
export default function createSearchIndex(packages: AllPackages, client: UncachedNpmInfoClient): Promise<void>;
