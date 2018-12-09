import { emptyDir } from "fs-extra";
import * as yargs from "yargs";

import { FS, getDefinitelyTyped, resolveDefinitelyTypedMaster } from "./get-definitely-typed";
import { Options } from "./lib/common";
import { generateNotNeededPackage, generateTypingPackage } from "./lib/package-generator";
import { AllPackages } from "./lib/packages";
import { outputDirPath } from "./lib/settings";
import { ChangedPackages, readChangedPackages } from "./lib/versions";
import { Fetcher } from "./util/io";
import { logger, writeLog } from "./util/logging";
import { writeTgz } from "./util/tgz";
import { logUncaughtErrors } from "./util/util";

if (!module.parent) {
    const tgz = !!yargs.argv.tgz;
    logUncaughtErrors(async () => {
        const githubAccessToken = process.env["GH_API_TOKEN"] || "";
        const fetcher = new Fetcher();
        const commit = await resolveDefinitelyTypedMaster(githubAccessToken, fetcher);
        const dt = await getDefinitelyTyped(Options.defaults, commit);
        const allPackages = await AllPackages.read(dt);
        await generatePackages(dt, commit, allPackages, await readChangedPackages(allPackages), tgz);
    });
}

export default async function generatePackages(dt: FS, gitHead: string, allPackages: AllPackages, changedPackages: ChangedPackages, tgz = false): Promise<void> {
    const [log, logResult] = logger();
    log("\n## Generating packages\n");

    await emptyDir(outputDirPath);

    for (const { pkg, version } of changedPackages.changedTypings) {
        await generateTypingPackage(pkg, allPackages, version, dt, gitHead);
        if (tgz) {
            await writeTgz(pkg.outputDirectory, `${pkg.outputDirectory}.tgz`);
        }
        log(` * ${pkg.libraryName}`);
    }
    for (const pkg of changedPackages.changedNotNeededPackages) {
        await generateNotNeededPackage(pkg);
    }

    await writeLog("package-generator.md", logResult());
}
