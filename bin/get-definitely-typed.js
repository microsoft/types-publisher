"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require("assert");
const fsp = require("fs-promise");
const path = require("path");
const child_process = require("child_process");
const common_1 = require("./lib/common");
const logging_1 = require("./lib/logging");
const util_1 = require("./lib/util");
if (!module.parent) {
    util_1.done(main());
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.loggerWithErrors();
        yield cloneIfNeeded(log);
        yield checkBranch(log);
        yield pull(log);
        yield logging_1.writeLog("get-definitely-typed.md", logging_1.joinLogWithErrors(logResult()));
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function cloneIfNeeded(log) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fsp.exists(common_1.settings.definitelyTypedPath)) {
            yield runCmd(`git clone ${common_1.settings.sourceRepository}`, path.dirname(common_1.settings.definitelyTypedPath), log);
            assert(yield fsp.exists(common_1.settings.definitelyTypedPath));
            yield runCmd(`git checkout ${common_1.settings.sourceBranch}`, common_1.settings.definitelyTypedPath, log);
        }
    });
}
function checkBranch(log) {
    return __awaiter(this, void 0, void 0, function* () {
        log.info(`Checking that branch is ${common_1.settings.sourceBranch}...`);
        const branch = (yield runCmd("git rev-parse --abbrev-ref HEAD", common_1.settings.definitelyTypedPath, log)).trim();
        if (branch !== common_1.settings.sourceBranch) {
            throw new Error(`Must be on ${common_1.settings.sourceBranch}; currently on ${branch}`);
        }
    });
}
function pull(log) {
    return __awaiter(this, void 0, void 0, function* () {
        yield runCmd("git pull", common_1.settings.definitelyTypedPath, log);
    });
}
function runCmd(cmd, cwd, log) {
    log.info(`exec: ${cmd}`);
    return new Promise((resolve, reject) => {
        const minute = 60 * 1000;
        const options = {
            cwd,
            timeout: 10 * minute,
            encoding: "utf8"
        };
        child_process.exec(cmd, options, (err, stdout, stderr) => {
            if (stdout) {
                log.info(`Response: ${stdout}`);
            }
            if (stderr) {
                log.error(`Error response: ${stderr}`);
            }
            if (err) {
                reject(err);
            }
            else {
                resolve(stdout);
            }
        });
    });
}
//# sourceMappingURL=get-definitely-typed.js.map