"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const appInsights = require("applicationinsights");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const package_publisher_1 = require("./lib/package-publisher");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const dry = !!yargs.argv.dry;
    const deprecateName = yargs.argv.deprecate;
    util_1.logUncaughtErrors(async () => {
        const dt = await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, logging_1.loggerWithErrors()[0]);
        if (deprecateName !== undefined) {
            // A '--deprecate' command is available in case types-publisher got stuck *while* trying to deprecate a package.
            // Normally this should not be needed.
            await package_publisher_1.deprecateNotNeededPackage(await npm_client_1.NpmPublishClient.create(), await packages_1.AllPackages.readSingleNotNeeded(deprecateName, dt), /*dry*/ false, logging_1.logger()[0]);
        }
        else {
            await publishPackages(await versions_1.readChangedPackages(await packages_1.AllPackages.read(dt)), dry, process.env.GH_API_TOKEN || "", new io_1.Fetcher());
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
        const commits = await queryGithub(`repos/DefinitelyTyped/DefinitelyTyped/commits?path=types%2f${cp.pkg.subDirectoryPath}`, githubAccessToken, fetcher);
        if (commits.length > 0) {
            log("Found related commits; hash: " + commits[0].sha);
            const prs = await queryGithub(`search/issues?q=is:pr%20is:merged%20${commits[0].sha}`, githubAccessToken, fetcher);
            let latestPr = 0;
            for (const pr of prs.items) {
                if (pr.number > latestPr) {
                    latestPr = pr.number;
                }
            }
            log("Latest PR: " + latestPr);
            if (latestPr === 0) {
                continue;
            }
            const latest = await queryGithub(`repos/DefinitelyTyped/DefinitelyTyped/pulls/${latestPr}`, githubAccessToken, fetcher);
            const latency = Date.now() - new Date(latest.merged_at).valueOf();
            const commitlatency = Date.now() - new Date(commits[0].commit.author.date).valueOf();
            log("Current date is " + new Date(Date.now()));
            log("  Merge date is " + new Date(latest.merged_at));
            const published = cp.pkg.fullNpmName + "@" + cp.version;
            const publishNotification = "I just published [`" + published + "` to npm](https://www.npmjs.com/package/" + cp.pkg.fullNpmName + ").";
            log(publishNotification);
            if (dry) {
                log("(dry) Skip publishing notification to github.");
            }
            else {
                const commented = await postGithub(`repos/DefinitelyTyped/DefinitelyTyped/issues/${latestPr}/comments`, { body: publishNotification }, githubAccessToken, fetcher);
                log("From github: " + JSON.stringify(commented).slice(0, 200));
            }
            if (dry) {
                log("(dry) Not logging latency");
            }
            else {
                appInsights.defaultClient.trackEvent({
                    name: "publish package",
                    properties: {
                        name: cp.pkg.desc,
                        latency: latency.toString(),
                        commitLatency: commitlatency.toString(),
                        authorCommit: commits[0].sha,
                        pr: latestPr.toString(),
                    },
                });
                appInsights.defaultClient.trackMetric({ name: "publish latency", value: latency });
                appInsights.defaultClient.trackMetric({ name: "author commit latency", value: commitlatency });
                log("Done logging latency");
            }
        }
    }
    for (const n of changedPackages.changedNotNeededPackages) {
        await package_publisher_1.publishNotNeededPackage(client, n, dry, log);
    }
    await logging_1.writeLog("publishing.md", logResult());
    console.log("Done!");
}
exports.default = publishPackages;
async function postGithub(path, data, githubToken, fetcher) {
    const [log] = logging_1.logger();
    const body = JSON.stringify(data);
    log(`Posting to github at ${path}: ${body}`);
    return fetcher.fetchJson({
        hostname: "api.github.com",
        method: "POST",
        path,
        body,
        headers: {
            // arbitrary string, but something must be provided
            "User-Agent": "types-publisher",
            "Content-Type": "application/json",
            Authorization: "token " + githubToken,
            "Content-Length": Buffer.byteLength(body),
        },
    });
}
async function queryGithub(path, githubToken, fetcher) {
    const [log] = logging_1.logger();
    log("Requesting from github: " + path);
    return fetcher.fetchJson({
        hostname: "api.github.com",
        method: "GET",
        path: path + "&access_token=" + githubToken,
        headers: {
            // arbitrary string, but something must be provided
            "User-Agent": "types-publisher",
        },
    });
}
//# sourceMappingURL=publish-packages.js.map