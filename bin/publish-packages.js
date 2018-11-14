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
    const deprecateName = yargs.argv.deprecate;
    util_1.logUncaughtErrors(async () => {
        const dt = await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults);
        if (deprecateName !== undefined) {
            // A '--deprecate' command is available in case types-publisher got stuck *while* trying to deprecate a package.
            // Normally this should not be needed.
            await package_publisher_1.deprecateNotNeededPackage(await npm_client_1.NpmPublishClient.create(), await packages_1.AllPackages.readSingleNotNeeded(deprecateName, dt));
        }
        else {
            await publishPackages(await versions_1.readChangedPackages(await packages_1.AllPackages.read(dt)), dry);
        }
    });
}
async function publishPackages(changedPackages, dry) {
    const [log, logResult] = logging_1.logger();
    if (dry) {
        log("=== DRY RUN ===");
    }
    const client = await npm_client_1.NpmPublishClient.create();
    for (const cp of changedPackages.changedTypings) {
        console.log(`Publishing ${cp.pkg.desc}...`);
        await package_publisher_1.publishTypingsPackage(client, cp, dry, log);
    }
    for (const n of changedPackages.changedNotNeededPackages) {
        await package_publisher_1.publishNotNeededPackage(client, n, dry, log);
    }
    await logging_1.writeLog("publishing.md", logResult());
    console.log("Done!");
}
exports.default = publishPackages;
//# sourceMappingURL=publish-packages.js.map