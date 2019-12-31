"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const appInsights = require("applicationinsights");
const yargs = require("yargs");
const common_1 = require("./lib/common");
const secrets_1 = require("./lib/secrets");
const webhook_server_1 = require("./lib/webhook-server");
const io_1 = require("./util/io");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.logUncaughtErrors(main());
}
async function main() {
    const key = await secrets_1.getSecret(secrets_1.Secret.GITHUB_SECRET);
    const githubAccessToken = await secrets_1.getSecret(secrets_1.Secret.GITHUB_ACCESS_TOKEN);
    const dry = !!(yargs.argv.dry || process.env.WEBHOOK_FORCE_DRY);
    const port = process.env.PORT;
    if (!(key && githubAccessToken && port)) {
        console.log("The environment variables GITHUB_SECRET and GITHUB_ACCESS_TOKEN and PORT must be set.");
    }
    else {
        console.log(`=== ${dry ? "DRY" : "PRODUCTION"} RUN ===`);
        if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
            appInsights.setup().start();
            console.log("Done initialising App Insights");
        }
        const fetcher = new io_1.Fetcher();
        try {
            const s = await webhook_server_1.default(key, githubAccessToken, dry, fetcher, common_1.Options.azure);
            console.log(`Listening on port ${port}`);
            s.listen(port);
        }
        catch (e) {
            appInsights.defaultClient.trackEvent({
                name: "crash",
                properties: {
                    error: e.toString(),
                },
            });
            throw e;
        }
    }
}
exports.default = main;
//# sourceMappingURL=webhook.js.map