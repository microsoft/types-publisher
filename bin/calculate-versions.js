"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(async () => main(await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults), new npm_client_1.UncachedNpmInfoClient()));
}
async function main(dt, uncachedClient) {
    console.log("=== Calculating versions ===");
    return npm_client_1.CachedNpmInfoClient.with(uncachedClient, async (client) => versions_1.computeAndSaveChangedPackages(await packages_1.AllPackages.read(dt), logging_1.consoleLogger.info, client));
}
exports.default = main;
//# sourceMappingURL=calculate-versions.js.map