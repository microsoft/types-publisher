"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const io_1 = require("../util/io");
const util_1 = require("../util/util");
const common_1 = require("./common");
function setIssueOk(githubAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        yield doUpdate(githubAccessToken, `Server has been up as of **${util_1.currentTimeStamp()}**`);
    });
}
exports.setIssueOk = setIssueOk;
function reopenIssue(githubAccessToken, timeStamp, error) {
    return __awaiter(this, void 0, void 0, function* () {
        yield doUpdate(githubAccessToken, createContent());
        function createContent() {
            const lines = [];
            const l = lines.push.bind(lines);
            l(`### There was a server error on **${timeStamp}**.`);
            l("The types-publisher server has shut down.");
            l("Please fix the issue and restart the server. The server will update this issue.");
            l("");
            const url = `https://${common_1.settings.azureContainer}.blob.core.windows.net/${common_1.settings.azureContainer}/index.html`;
            l(`Logs are available [here](${url}).`);
            l("");
            l(util_1.indent(error.stack));
            return lines.join("\n");
        }
    });
}
exports.reopenIssue = reopenIssue;
function doUpdate(accessToken, body) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://api.github.com/repos/${common_1.settings.errorsIssue}?access_token=${accessToken}`;
        const message = { body, state: "open" };
        const responseBody = yield io_1.fetchJson(url, { method: "PATCH", body: JSON.stringify(message) });
        if (responseBody.body !== body) {
            throw new Error(JSON.stringify(responseBody, undefined, 4));
        }
    });
}
//# sourceMappingURL=issue-updater.js.map