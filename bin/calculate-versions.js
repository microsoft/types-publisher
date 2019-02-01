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
    const log = logging_1.loggerWithErrors()[0];
    util_1.logUncaughtErrors(async () => calculateVersions(await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, log), new npm_client_1.UncachedNpmInfoClient(), log));
}
async function calculateVersions(dt, uncachedClient, log) {
    log.info("=== Calculating versions ===");
    return npm_client_1.CachedNpmInfoClient.with(uncachedClient, async (client) => {
        log.info("Reading packages...");
        const packages = await packages_1.AllPackages.read(dt);
        return versions_1.computeAndSaveChangedPackages(packages, log, client);
    });
}
exports.default = calculateVersions;
//# sourceMappingURL=calculate-versions.js.map