"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fsp = require("fs-promise");
const nodegit_1 = require("nodegit");
const common_1 = require("./lib/common");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(common_1.Options.defaults));
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const repo = yield getRepo(options);
        yield pull(repo, console.log);
        yield checkStatus(repo);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function getRepo(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield fsp.exists(options.definitelyTypedPath)) {
            const repo = yield nodegit_1.Repository.open(options.definitelyTypedPath);
            const currentBranch = (yield repo.getCurrentBranch()).name();
            const correctBranch = `refs/heads/${common_1.settings.sourceBranch}`;
            if (currentBranch !== correctBranch) {
                throw new Error(`Need to checkout ${correctBranch}, currently on ${currentBranch}`);
            }
            return repo;
        }
        else {
            const repo = yield nodegit_1.Clone(common_1.settings.sourceRepository, options.definitelyTypedPath);
            yield repo.checkoutBranch(common_1.settings.sourceBranch);
            return repo;
        }
    });
}
function pull(repo, log) {
    return __awaiter(this, void 0, void 0, function* () {
        log(`Fetching changes from ${common_1.settings.sourceBranch}`);
        yield repo.fetchAll();
        log(`Merging changes`);
        yield repo.mergeBranches(common_1.settings.sourceBranch, `origin/${common_1.settings.sourceBranch}`);
    });
}
function checkStatus(repo) {
    return __awaiter(this, void 0, void 0, function* () {
        const statuses = yield repo.getStatus();
        const changedFiles = statuses.map(s => s.path()).filter(path => !nodegit_1.Ignore.pathIsIgnored(repo, path));
        if (changedFiles.length) {
            throw new Error(`The following files are dirty: ${changedFiles}`);
        }
    });
}
//# sourceMappingURL=get-definitely-typed.js.map