"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fetch = require("node-fetch");
const common_1 = require("./lib/common");
const util_1 = require("./lib/util");
const webhook_server_1 = require("./lib/webhook-server");
const yargs = require("yargs");
if (!module.parent) {
    const remote = yargs.argv.remote;
    const key = process.env["GITHUB_SECRET"];
    const port = parseInt(process.env["PORT"], 10);
    if (!(key && port)) {
        throw new Error("Must provide GITHUB_SECRET and PORT");
    }
    util_1.done(main(key, port, remote));
}
function main(key, port, remote) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = remote ? "http://types-publisher.azurewebsites.net" : `http://localhost:${port}`;
        const body = JSON.stringify({ ref: `refs/heads/${common_1.settings.sourceBranch}` });
        const headers = { "x-hub-signature": webhook_server_1.expectedSignature(key, body) };
        const resp = yield fetch(url, { method: "POST", body, headers });
        console.log(yield resp.text());
    });
}
//# sourceMappingURL=make-server-run.js.map