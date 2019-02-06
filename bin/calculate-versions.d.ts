import { FS } from "./get-definitely-typed";
import { UncachedNpmInfoClient } from "./lib/npm-client";
import { ChangedPackages } from "./lib/versions";
import { LoggerWithErrors } from "./util/logging";
export default function calculateVersions(dt: FS, uncachedClient: UncachedNpmInfoClient, log: LoggerWithErrors): Promise<ChangedPackages>;
