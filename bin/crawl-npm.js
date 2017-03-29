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
const assert = require("assert");
const oboe = require("oboe");
const check_parse_results_1 = require("./check-parse-results");
const common_1 = require("./lib/common");
const settings_1 = require("./lib/settings");
const progress_1 = require("./util/progress");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(common_1.Options.defaults));
}
/** Prints out every package on NPM with 'types'. */
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const all = yield allNpmPackages();
        yield common_1.writeDataFile("all-npm-packages.json", all);
        const allTyped = yield util_1.filterNAtATime(10, all, check_parse_results_1.packageHasTypes, {
            name: "Checking for types...",
            flavor: (name, isTyped) => isTyped ? name : undefined,
            options
        });
        yield common_1.writeDataFile("all-typed-packages.json", allTyped);
        console.log(allTyped.join("\n"));
        console.log(`Found ${allTyped.length} typed packages.`);
    });
}
function allNpmPackages() {
    const progress = new progress_1.default({ name: "Loading NPM packages..." });
    // https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
    const url = settings_1.npmRegistry + "-/all";
    const all = [];
    return new Promise((resolve, reject) => {
        oboe(url)
            .node("!.*", (x, path) => {
            assert(path.length > 0);
            if (typeof x !== "number") {
                const { name } = x;
                assert(typeof name === "string" && name.length > 0);
                progress.update(progress_1.strProgress(name), name);
                all.push(name);
            }
            return oboe.drop;
        })
            .done(() => {
            progress.done();
            resolve(all);
        })
            .fail(err => reject(err.thrown));
    });
}
//# sourceMappingURL=crawl-npm.js.map