"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const oboe = require("oboe");
const check_parse_results_1 = require("./check-parse-results");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const settings_1 = require("./lib/settings");
const progress_1 = require("./util/progress");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(common_1.Options.defaults));
}
/** Prints out every package on NPM with 'types'. */
async function main(options) {
    const all = await allNpmPackages();
    await common_1.writeDataFile("all-npm-packages.json", all);
    const client = new npm_client_1.UncachedNpmInfoClient();
    const allTyped = await util_1.filterNAtATime(10, all, pkg => check_parse_results_1.packageHasTypes(pkg, client), {
        name: "Checking for types...",
        flavor: (name, isTyped) => isTyped ? name : undefined,
        options
    });
    await common_1.writeDataFile("all-typed-packages.json", allTyped);
    console.log(allTyped.join("\n"));
    console.log(`Found ${allTyped.length} typed packages.`);
}
function allNpmPackages() {
    const progress = new progress_1.default({ name: "Loading NPM packages..." });
    // https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
    const url = `${settings_1.npmRegistry}-/all`;
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
            .fail(err => { reject(err.thrown); });
    });
}
//# sourceMappingURL=crawl-npm.js.map