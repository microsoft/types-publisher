"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util/util");
const settings_1 = require("./settings");
async function setIssueOk(githubAccessToken, fetcher) {
    await doUpdate(githubAccessToken, `Server has been up as of **${util_1.currentTimeStamp()}**`, fetcher);
}
exports.setIssueOk = setIssueOk;
async function reopenIssue(githubAccessToken, timeStamp, error, fetcher) {
    await doUpdate(githubAccessToken, createContent(), fetcher);
    function createContent() {
        const lines = [];
        const l = lines.push.bind(lines);
        l(`### There was a server error on **${timeStamp}**.`);
        l("The types-publisher server has shut down.");
        l("Please fix the issue and restart the server. The server will update this issue.");
        l("");
        const url = `https://${settings_1.azureContainer}.blob.core.windows.net/${settings_1.azureContainer}/index.html`;
        l(`Logs are available [here](${url}).`);
        l("");
        l(util_1.indent(util_1.errorDetails(error)));
        return lines.join("\n");
    }
}
exports.reopenIssue = reopenIssue;
async function doUpdate(accessToken, body, fetcher) {
    const message = { body, state: "open" };
    const responseBody = await fetcher.fetchJson({
        hostname: "api.github.com",
        path: `repos/${settings_1.errorsIssue}?access_token=${accessToken}`,
        body: JSON.stringify(message),
        method: "PATCH",
        headers: {
            // arbitrary string, but something must be provided
            "User-Agent": "types-publisher"
        },
    });
    if (responseBody.body !== body) {
        throw new Error(JSON.stringify(responseBody, undefined, 4));
    }
}
//# sourceMappingURL=issue-updater.js.map