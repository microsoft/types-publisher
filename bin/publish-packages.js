"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const package_publisher_1 = require("./lib/package-publisher");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const dry = !!yargs.argv.dry;
    const singleName = yargs.argv.single;
    const deprecateName = yargs.argv.deprecate;
    if (singleName !== undefined && deprecateName !== undefined) {
        throw new Error("Select only one of --single=foo or --deprecate=foo or --shouldUnpublish");
    }
    util_1.done(async () => {
        const dt = await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults);
        if (deprecateName !== undefined) {
            // A '--deprecate' command is available in case types-publisher got stuck *while* trying to deprecate a package.
            // Normally this should not be needed.
            await package_publisher_1.deprecateNotNeededPackage(await npm_client_1.NpmPublishClient.create(), await packages_1.AllPackages.readSingleNotNeeded(deprecateName, dt));
        }
        else if (singleName !== undefined) {
            await single(singleName, dt, dry);
        }
        else {
            await main(await packages_1.AllPackages.read(dt), await versions_1.readVersionsAndChanges(), dry);
        }
    });
}
async function main(allPackages, { versions, changes }, dry) {
    const [log, logResult] = logging_1.logger();
    if (dry) {
        log("=== DRY RUN ===");
    }
    const packagesShouldPublish = await versions_1.changedPackages(allPackages, changes);
    const client = await npm_client_1.NpmPublishClient.create();
    for (const pkg of packagesShouldPublish) {
        console.log(`Publishing ${pkg.desc}...`);
        const publishLog = await package_publisher_1.default(client, pkg, packagesShouldPublish, versions, allPackages.getLatest(pkg), dry);
        writeLogs({ infos: publishLog, errors: [] });
    }
    function writeLogs(res) {
        for (const line of res.infos) {
            log(`   * ${line}`);
        }
        for (const err of res.errors) {
            log(`   * ERROR: ${err}`);
        }
    }
    await logging_1.writeLog("publishing.md", logResult());
    console.log("Done!");
}
exports.default = main;
async function single(name, dt, dry) {
    const allPackages = await packages_1.AllPackages.read(dt);
    const versions = await versions_1.default.load();
    const pkg = await packages_1.AllPackages.readSingle(name);
    const publishLog = await package_publisher_1.default(await npm_client_1.NpmPublishClient.create(), pkg, [], versions, allPackages.getLatest(pkg), dry);
    console.log(publishLog);
}
//# sourceMappingURL=publish-packages.js.map