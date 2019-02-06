import { FS } from "./get-definitely-typed";
import { UncachedNpmInfoClient } from "./lib/npm-client";
import { AllPackages } from "./lib/packages";
export default function publishRegistry(dt: FS, allPackages: AllPackages, dry: boolean, client: UncachedNpmInfoClient): Promise<void>;
