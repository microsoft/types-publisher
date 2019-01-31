"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const timers_1 = require("timers");
const appInsights = require("applicationinsights");
const full_1 = require("./full");
const common_1 = require("./lib/common");
const secrets_1 = require("./lib/secrets");
const logging_1 = require("./util/logging");
const io_1 = require("./util/io");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.logUncaughtErrors(main());
}
async function main() {
    const key = await secrets_1.getSecret(secrets_1.Secret.GITHUB_SECRET);
    const githubAccessToken = await secrets_1.getSecret(secrets_1.Secret.GITHUB_ACCESS_TOKEN);
    const dry = !!(yargs.argv.dry || process.env.WEBHOOK_FORCE_DRY);
    if (!(key && githubAccessToken)) {
        console.log("The environment variables GITHUB_SECRET and GITHUB_ACCESS_TOKEN must be set.");
    }
    else {
        console.log(`=== ${dry ? "DRY" : "PRODUCTION"} RUN ===`);
        appInsights.setup(process.env["APPINSIGHTS_INSTRUMENTATIONKEY"]).start();
        console.log("Done initialising App Insights");
        const fetcher = new io_1.Fetcher();
        try {
            await webhookServer(githubAccessToken, dry, fetcher, common_1.Options.azure);
        }
        catch (e) {
            appInsights.defaultClient.trackEvent({
                name: "crash",
                properties: {
                    error: e.toString()
                },
            });
            throw e;
        }
    }
}
exports.default = main;
async function webhookServer(githubAccessToken, dry, fetcher, options) {
    const fullOnce = updateOneAtATime(async (log) => {
        const timeStamp = util_1.currentTimeStamp();
        log.info("");
        log.info("");
        log.info(`# ${timeStamp}`);
        log.info("");
        log.info("Starting full...");
        await full_1.default(dry, timeStamp, githubAccessToken, fetcher, options);
    });
    const log = logging_1.loggerWithErrors()[0];
    await fullOnce(log);
    timers_1.setInterval(fullOnce, 1000000, log);
}
// Even if there are many changes to DefinitelyTyped in a row, we only perform one update at a time.
function updateOneAtATime(doOnce) {
    let working = false;
    let anyUpdatesWhileWorking = false;
    return (log) => {
        if (working) {
            anyUpdatesWhileWorking = true;
            log.info("Not starting update, because already performing one.");
            return undefined;
        }
        else {
            working = false;
            anyUpdatesWhileWorking = false;
            return work();
        }
        async function work() {
            log.info("Starting update");
            working = true;
            anyUpdatesWhileWorking = false;
            do {
                await doOnce(log);
                working = false;
            } while (anyUpdatesWhileWorking);
        }
    };
}
//# sourceMappingURL=webhook.js.map