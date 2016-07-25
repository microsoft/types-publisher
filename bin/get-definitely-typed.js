"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const common_1 = require("./lib/common");
if (!module.parent) {
    main();
}
function main() {
    const log = new common_1.ArrayLog();
    cloneIfNeeded(log);
    checkBranch(log);
    pull(log);
    const { infos, errors } = log.result();
    assert(!errors.length);
    common_1.writeLogSync("get-definitely-typed.md", infos);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function cloneIfNeeded(log) {
    if (!fs.existsSync(common_1.settings.definitelyTypedPath)) {
        log.info("Cloning");
        runCmd(`git clone ${common_1.settings.sourceRepository}`, path.dirname(common_1.settings.definitelyTypedPath));
        assert(fs.existsSync(common_1.settings.definitelyTypedPath));
        runCmd(`git checkout ${common_1.settings.sourceBranch}`, common_1.settings.definitelyTypedPath);
    }
}
function checkBranch(log) {
    log.info(`Checking that branch is ${common_1.settings.sourceBranch}...`);
    const branch = runCmd("git rev-parse --abbrev-ref HEAD", common_1.settings.definitelyTypedPath).trim();
    if (branch !== common_1.settings.sourceBranch) {
        throw new Error(`Must be on ${common_1.settings.sourceBranch}; currently on ${branch}`);
    }
}
function pull(log) {
    log.info("Pulling...");
    runCmd("git pull", common_1.settings.definitelyTypedPath);
}
function runCmd(cmd, cwd) {
    return child_process.execSync(cmd, {
        cwd,
        timeout: 60 * 1000,
        encoding: "utf8"
    });
}
//# sourceMappingURL=get-definitely-typed.js.map