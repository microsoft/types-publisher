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
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const util_1 = require("./util/util");
if (!module.parent) {
    const single = yargs.argv.single;
    if (single) {
        util_1.done(doSingle(single, new npm_client_1.UncachedNpmInfoClient()));
    }
    else {
        util_1.done(() => __awaiter(this, void 0, void 0, function* () { return main(yield packages_1.AllPackages.read(yield get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults)), new npm_client_1.UncachedNpmInfoClient()); }));
    }
}
function main(packages, client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Generating search index...");
        const records = yield createSearchRecords(packages.allLatestTypings(), client);
        console.log("Done generating search index. Writing out data files...");
        yield common_1.writeDataFile("search-index-min.json", records, false);
    });
}
exports.default = main;
function doSingle(name, client) {
    return __awaiter(this, void 0, void 0, function* () {
        const pkg = yield packages_1.AllPackages.readSingle(name);
        const record = (yield createSearchRecords([pkg], client))[0];
        console.log(record);
    });
}
function createSearchRecords(packages, client) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: Would like to just use pkg.unescapedName unconditionally, but npm doesn't allow scoped packages.
        const dl = yield client.getDownloads(packages.map((pkg, i) => pkg.name === pkg.unescapedName ? pkg.name : `dummy${i}`));
        return packages.map((pkg, i) => ({
            p: pkg.projectName,
            l: pkg.libraryName,
            g: pkg.globals,
            t: pkg.name,
            m: pkg.declaredModules,
            d: dl[i],
            r: pkg.isNotNeeded() ? pkg.sourceRepoURL : undefined
        })).sort((a, b) => b.d - a.d);
    });
}
//# sourceMappingURL=create-search-index.js.map