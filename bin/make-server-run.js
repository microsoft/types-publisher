"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const secrets_1 = require("./lib/secrets");
const settings_1 = require("./lib/settings");
const webhook_server_1 = require("./lib/webhook-server");
const io_1 = require("./util/io");
const util_1 = require("./util/util");
if (!module.parent) {
    const remote = yargs.argv.remote;
    util_1.logUncaughtErrors(main(remote ? { hostname: "typespublisher.azurewebsites.net" } : { hostname: "localhost", port: getPort() }));
}
function getPort() {
    const port = parseInt(process.env.PORT, 10);
    if (!port) {
        throw new Error("Must provide PORT");
    }
    return port;
}
async function main(options) {
    const key = await secrets_1.getSecret(secrets_1.Secret.GITHUB_SECRET);
    const body = JSON.stringify({ ref: `refs/heads/${settings_1.sourceBranch}` });
    console.log(await io_1.makeHttpRequest({
        hostname: options.hostname,
        port: options.port,
        path: "",
        method: "POST",
        body,
        headers: { "x-hub-signature": webhook_server_1.expectedSignature(key, body) },
    }));
}
//# sourceMappingURL=make-server-run.js.map