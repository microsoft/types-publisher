"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const appInsights = require("applicationinsights");
const io_1 = require("./util/io");
const calculate_versions_1 = require("./calculate-versions");
const clean_1 = require("./clean");
const create_search_index_1 = require("./create-search-index");
const generate_packages_1 = require("./generate-packages");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const parse_definitions_1 = require("./parse-definitions");
const publish_packages_1 = require("./publish-packages");
const publish_registry_1 = require("./publish-registry");
const upload_blobs_1 = require("./upload-blobs");
const util_1 = require("./util/util");
const validate_1 = require("./validate");
const logging_1 = require("./util/logging");
if (!module.parent) {
    appInsights.setup();
    appInsights.start();
    const dry = !!yargs.argv.dry;
    util_1.logUncaughtErrors(full(dry, util_1.currentTimeStamp(), process.env["GH_API_TOKEN"] || "", new io_1.Fetcher(), common_1.Options.defaults, logging_1.loggerWithErrors()[0]));
}
async function full(dry, timeStamp, githubAccessToken, fetcher, options, log) {
    const infoClient = new npm_client_1.UncachedNpmInfoClient();
    await clean_1.default();
    const dt = await get_definitely_typed_1.getDefinitelyTyped(options, log);
    const allPackages = await parse_definitions_1.default(dt, options.parseInParallel
        ? { nProcesses: util_1.numberOfOsProcesses, definitelyTypedPath: util_1.assertDefined(options.definitelyTypedPath) }
        : undefined, log);
    const changedPackages = await calculate_versions_1.default(dt, infoClient, log);
    await generate_packages_1.default(dt, allPackages, changedPackages);
    await create_search_index_1.default(allPackages, infoClient);
    await publish_packages_1.default(changedPackages, dry, githubAccessToken, fetcher);
    await publish_registry_1.default(dt, allPackages, dry, infoClient);
    await validate_1.default(dt);
    if (!dry) {
        await upload_blobs_1.default(timeStamp);
    }
}
exports.default = full;
//# sourceMappingURL=full.js.map