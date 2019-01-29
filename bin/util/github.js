"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./logging");
async function queryGithub(path, _githubToken, fetcher) {
    const [log] = logging_1.logger();
    log("Requesting from github: " + path);
    return fetcher.fetchJson({
        hostname: "api.github.com",
        path: path,
        method: "GET",
        headers: {
            // arbitrary string, but something must be provided
            "User-Agent": "types-publisher",
        },
    });
}
exports.queryGithub = queryGithub;
//# sourceMappingURL=github.js.map