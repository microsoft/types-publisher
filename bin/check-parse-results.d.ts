import { FS } from "./get-definitely-typed";
import { Options } from "./lib/common";
import { UncachedNpmInfoClient } from "./lib/npm-client";
export default function checkParseResults(includeNpmChecks: boolean, dt: FS, options: Options, client: UncachedNpmInfoClient): Promise<void>;
export declare function packageHasTypes(packageName: string, client: UncachedNpmInfoClient): Promise<boolean>;
