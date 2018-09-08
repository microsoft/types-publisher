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
const fs_extra_1 = require("fs-extra");
const nodegit_1 = require("nodegit");
const common_1 = require("./lib/common");
const settings_1 = require("./lib/settings");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(common_1.Options.defaults));
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const dtPath = options.definitelyTypedPath;
        if (yield fs_extra_1.pathExists(options.definitelyTypedPath)) {
            const repo = yield nodegit_1.Repository.open(options.definitelyTypedPath);
            const actualBranch = (yield repo.getCurrentBranch()).name();
            if (actualBranch !== `refs/heads/${settings_1.sourceBranch}`) {
                throw new Error(`Please checkout branch '${settings_1.sourceBranch}'`);
            }
            console.log(`Fetching changes from ${settings_1.sourceBranch}...`);
            if (options.resetDefinitelyTyped) {
                const headCommit = yield repo.getHeadCommit();
                console.log("Resetting...");
                yield nodegit_1.Reset.reset(repo, headCommit, 3 /* HARD */, undefined);
            }
            console.log("Checking status...");
            yield checkStatus(repo);
            console.log("Fetching...");
            yield repo.fetch("origin");
            console.log("Merging...");
            yield repo.mergeBranches(settings_1.sourceBranch, `origin/${settings_1.sourceBranch}`, undefined, undefined);
            console.log("done");
        }
        else {
            console.log(`Cloning ${settings_1.sourceRepository} to ${dtPath}`);
            const repo = yield nodegit_1.Clone.clone(settings_1.sourceRepository, dtPath);
            yield repo.checkoutBranch(settings_1.sourceBranch);
        }
    });
}
exports.default = main;
function checkStatus(repo) {
    return __awaiter(this, void 0, void 0, function* () {
        const statuses = yield repo.getStatus();
        const changedFiles = yield util_1.filterNAtATime(1, statuses.map(s => s.path()), (path) => __awaiter(this, void 0, void 0, function* () { return !(yield nodegit_1.Ignore.pathIsIgnored(repo, path)); }));
        if (changedFiles.length) {
            throw new Error(`The following files are dirty: ${changedFiles}`);
        }
    });
}
//# sourceMappingURL=get-definitely-typed.js.map