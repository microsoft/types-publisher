"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const log = logging_1.loggerWithErrors()[0];
    const single = yargs.argv.single;
    if (single) {
        util_1.logUncaughtErrors(doSingle(single, new npm_client_1.UncachedNpmInfoClient()));
    }
    else {
        util_1.logUncaughtErrors(async () => createSearchIndex(await packages_1.AllPackages.read(await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, log)), new npm_client_1.UncachedNpmInfoClient()));
    }
}
async function createSearchIndex(packages, client) {
    console.log("Generating search index...");
    const records = await createSearchRecords(packages.allLatestTypings(), client);
    console.log("Done generating search index. Writing out data files...");
    await common_1.writeDataFile("search-index-min.json", records, false);
}
exports.default = createSearchIndex;
async function doSingle(name, client) {
    const pkg = await packages_1.AllPackages.readSingle(name);
    const record = (await createSearchRecords([pkg], client))[0];
    console.log(record);
}
async function createSearchRecords(packages, client) {
    // TODO: Would like to just use pkg.unescapedName unconditionally, but npm doesn't allow scoped packages.
    const dl = await client.getDownloads(packages.map((pkg, i) => pkg.name === pkg.unescapedName ? pkg.name : `dummy${i}`));
    return packages.map((pkg, i) => ({
        p: pkg.projectName,
        l: pkg.libraryName,
        g: pkg.globals,
        t: pkg.name,
        m: pkg.declaredModules,
        d: dl[i],
    })).sort((a, b) => b.d - a.d);
}
//# sourceMappingURL=create-search-index.js.map