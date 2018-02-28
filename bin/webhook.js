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
const common_1 = require("./lib/common");
const issue_updater_1 = require("./lib/issue-updater");
const secrets_1 = require("./lib/secrets");
const webhook_server_1 = require("./lib/webhook-server");
const io_1 = require("./util/io");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main());
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const key = yield secrets_1.getSecret(secrets_1.Secret.GITHUB_SECRET);
        const githubAccessToken = yield secrets_1.getSecret(secrets_1.Secret.GITHUB_ACCESS_TOKEN);
        const dry = !!(yargs.argv.dry || process.env.WEBHOOK_FORCE_DRY);
        const port = process.env.PORT;
        if (!(key && githubAccessToken && port)) {
            console.log("The environment variables GITHUB_SECRET and GITHUB_ACCESS_TOKEN and PORT must be set.");
        }
        else {
            console.log(`=== ${dry ? "DRY" : "PRODUCTION"} RUN ===`);
            const fetcher = new io_1.Fetcher();
            const s = yield webhook_server_1.default(key, githubAccessToken, dry, fetcher, common_1.Options.azure);
            yield issue_updater_1.setIssueOk(githubAccessToken, fetcher);
            console.log(`Listening on port ${port}`);
            s.listen(port);
        }
    });
}
exports.default = main;
//# sourceMappingURL=webhook.js.map