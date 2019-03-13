import { FS } from "./get-definitely-typed";
import { CachedNpmInfoClient, UncachedNpmInfoClient } from "./lib/npm-client";
import { TypingsData } from "./lib/packages";
import { ChangedPackages } from "./lib/versions";
import { LoggerWithErrors } from "./util/logging";
export default function calculateVersions(dt: FS, uncachedClient: UncachedNpmInfoClient, log: LoggerWithErrors): Promise<ChangedPackages>;
export declare function getLatestTypingVersion(pkg: TypingsData, client: CachedNpmInfoClient): Promise<string>;
