"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const package_generator_1 = require("./lib/package-generator");
const packages_1 = require("./lib/packages");
const settings_1 = require("./lib/settings");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const tgz_1 = require("./util/tgz");
const util_1 = require("./util/util");
if (!module.parent) {
    const tgz = !!yargs.argv.tgz;
    util_1.logUncaughtErrors(async () => {
        const log = logging_1.loggerWithErrors()[0];
        const dt = await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, log);
        const allPackages = await packages_1.AllPackages.read(dt);
        await generatePackages(dt, allPackages, await versions_1.readChangedPackages(allPackages), tgz);
    });
}
async function generatePackages(dt, allPackages, changedPackages, tgz = false) {
    const [log, logResult] = logging_1.logger();
    log("\n## Generating packages\n");
    await fs_extra_1.emptyDir(settings_1.outputDirPath);
    for (const { pkg, version } of changedPackages.changedTypings) {
        await package_generator_1.generateTypingPackage(pkg, allPackages, version, dt);
        if (tgz) {
            await tgz_1.writeTgz(pkg.outputDirectory, `${pkg.outputDirectory}.tgz`);
        }
        log(` * ${pkg.libraryName}`);
    }
    for (const pkg of changedPackages.changedNotNeededPackages) {
        await package_generator_1.generateNotNeededPackage(pkg);
    }
    await logging_1.writeLog("package-generator.md", logResult());
}
exports.default = generatePackages;
//# sourceMappingURL=generate-packages.js.map