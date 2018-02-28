"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const secrets_1 = require("./lib/secrets");
const settings_1 = require("./lib/settings");
const webhook_server_1 = require("./lib/webhook-server");
const io_1 = require("./util/io");
const util_1 = require("./util/util");
if (!module.parent) {
    const remote = yargs.argv.remote;
    util_1.done(main(remote ? { hostname: "typespublisher.azurewebsites.net" } : { hostname: "localhost", port: getPort() }));
}
function getPort() {
    const port = parseInt(process.env.PORT, 10);
    if (!port) {
        throw new Error("Must provide PORT");
    }
    return port;
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = yield secrets_1.getSecret(secrets_1.Secret.GITHUB_SECRET);
        const body = JSON.stringify({ ref: `refs/heads/${settings_1.sourceBranch}` });
        console.log(yield new io_1.Fetcher().fetch({
            hostname: options.hostname,
            port: options.port,
            path: "",
            method: "POST",
            body,
            headers: { "x-hub-signature": webhook_server_1.expectedSignature(key, body) },
        }));
    });
}
//# sourceMappingURL=make-server-run.js.map