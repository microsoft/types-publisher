import { FS, getDefinitelyTyped } from "./get-definitely-typed";
import { Options } from "./lib/common";
import { CachedNpmInfoClient, UncachedNpmInfoClient } from "./lib/npm-client";
import { AllPackages } from "./lib/packages";
import { ChangedPackages, computeAndSaveChangedPackages } from "./lib/versions";
import { loggerWithErrors, LoggerWithErrors } from "./util/logging";
import { logUncaughtErrors } from "./util/util";

if (!module.parent) {
    const log = loggerWithErrors()[0];
    logUncaughtErrors(async () => calculateVersions(await getDefinitelyTyped(Options.defaults, log), new UncachedNpmInfoClient(), log));
}

export default async function calculateVersions(dt: FS, uncachedClient: UncachedNpmInfoClient, log: LoggerWithErrors): Promise<ChangedPackages> {
    log.info("=== Calculating versions ===");
    return CachedNpmInfoClient.with(uncachedClient, async client =>
        computeAndSaveChangedPackages(await AllPackages.read(dt), log, client));
}
