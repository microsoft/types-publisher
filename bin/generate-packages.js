"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const package_generator_1 = require("./lib/package-generator");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const tgz_1 = require("./util/tgz");
const util_1 = require("./util/util");
if (!module.parent) {
    const all = yargs.argv.all;
    const singleName = yargs.argv.single;
    const tgz = !!yargs.argv.tgz;
    if (all && singleName) {
        throw new Error("Select only one of -single=foo or --all.");
    }
    util_1.done(async () => {
        const dt = await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults);
        await (singleName ? single(singleName, dt) : main(dt, await packages_1.AllPackages.read(dt), await versions_1.readVersionsAndChanges(), all, tgz));
    });
}
async function main(dt, allPackages, { versions, changes }, all = false, tgz = false) {
    const [log, logResult] = logging_1.logger();
    log(`\n## Generating ${all ? "all" : "changed"} packages\n`);
    await fs_extra_1.emptyDir(packages_1.outputDir);
    const packages = all ? allPackages.allPackages() : await versions_1.changedPackages(allPackages, changes);
    await util_1.nAtATime(10, packages, async (pkg) => {
        const logs = await package_generator_1.default(pkg, allPackages, versions, dt);
        if (tgz) {
            await tgz_1.writeTgz(pkg.outputDirectory, `${pkg.outputDirectory}.tgz`);
        }
        log(` * ${pkg.libraryName}`);
        logging_1.moveLogs(log, logs, line => `   * ${line}`);
    });
    await logging_1.writeLog("package-generator.md", logResult());
}
exports.default = main;
async function single(singleName, dt) {
    await fs_extra_1.emptyDir(packages_1.outputDir);
    const allPackages = await packages_1.AllPackages.read(dt);
    const pkg = allPackages.getSingle(singleName);
    const versions = await versions_1.default.load();
    const logs = await package_generator_1.default(pkg, allPackages, versions, dt);
    console.log(logs.join("\n"));
}
//# sourceMappingURL=generate-packages.js.map