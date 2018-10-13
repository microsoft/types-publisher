"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const forceUpdate = yargs.argv.forceUpdate;
    util_1.done(async () => main(forceUpdate, await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults), new npm_client_1.UncachedNpmInfoClient()));
}
async function main(forceUpdate, dt, uncachedClient) {
    console.log("=== Calculating versions ===");
    return npm_client_1.CachedNpmInfoClient.with(uncachedClient, async (client) => {
        const ver = await versions_1.default.determineFromNpm(await packages_1.AllPackages.read(dt), logging_1.consoleLogger.info, forceUpdate, client);
        await versions_1.writeChanges(ver.changes);
        await ver.versions.save();
        return ver;
    });
}
exports.default = main;
//# sourceMappingURL=calculate-versions.js.map