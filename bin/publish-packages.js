"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const appInsights = require("applicationinsights");
const io_1 = require("./util/io");
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
            await publishPackages(await versions_1.readChangedPackages(await packages_1.AllPackages.read(dt)), dry, process.env["GH_API_TOKEN"] || "", new io_1.Fetcher());
        }
    });
}
async function publishPackages(changedPackages, dry, githubAccessToken, fetcher) {
    const [log, logResult] = logging_1.logger();
    if (dry) {
        log("=== DRY RUN ===");
    }
    const client = await npm_client_1.NpmPublishClient.create();
    for (const cp of changedPackages.changedTypings) {
        log(`Publishing ${cp.pkg.desc}...`);
        await package_publisher_1.publishTypingsPackage(client, cp, dry, log);
        const path = `repos/DefinitelyTyped/DefinitelyTyped/commits?path=types%2f${cp.pkg.desc}&access_token=${githubAccessToken}`;
        log("Requesting from github: " + path);
        const commits = await fetcher.fetchJson({
            hostname: "api.github.com",
            path,
            method: "GET",
            headers: {
                // arbitrary string, but something must be provided
                "User-Agent": "types-publisher",
            },
        });
        if (commits.length > 0) {
            const latency = Date.now() - new Date(commits[0].commit.author.date).valueOf();
            log("Found related commits, logging event and metric:" + latency);
            log("Current date is " + new Date(Date.now()));
            log(" Commit date is " + new Date(commits[0].commit.author.date));
            log(" Commit hash is " + commits[0].sha);
            appInsights.defaultClient.trackEvent({
                name: "publish package",
                properties: {
                    name: cp.pkg.desc,
                    latency: latency.toString()
                }
            });
            appInsights.defaultClient.trackMetric({ name: "publish latency", value: latency });
            log("Done logging latency");
        }
    }
    for (const n of changedPackages.changedNotNeededPackages) {
        await package_publisher_1.publishNotNeededPackage(client, n, dry, log);
    }
    await logging_1.writeLog("publishing.md", logResult());
    console.log("Done!");
}
exports.default = publishPackages;
//# sourceMappingURL=publish-packages.js.map