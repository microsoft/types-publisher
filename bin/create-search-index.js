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
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const search_index_generator_1 = require("./lib/search-index-generator");
const util_1 = require("./util/util");
if (!module.parent) {
    const skipDownloads = yargs.argv.skipDownloads;
    const single = yargs.argv.single;
    if (single) {
        util_1.done(doSingle(single, skipDownloads, new npm_client_1.UncachedNpmInfoClient()));
    }
    else {
        const full = yargs.argv.full;
        util_1.done(main(skipDownloads, full, new npm_client_1.UncachedNpmInfoClient(), common_1.Options.defaults));
    }
}
function main(skipDownloads, full, client, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const packages = yield packages_1.AllPackages.readTypings();
        console.log("Generating search index...");
        const records = yield util_1.nAtATime(25, packages, pkg => search_index_generator_1.createSearchRecord(pkg, skipDownloads, client), {
            name: "Indexing...",
            flavor: pkg => pkg.desc,
            options
        });
        // Most downloads first
        records.sort((a, b) => b.d - a.d);
        console.log("Done generating search index");
        console.log("Writing out data files");
        yield common_1.writeDataFile("search-index-min.json", records, false);
        if (full) {
            yield common_1.writeDataFile("search-index-full.json", records.map(verboseRecord), true);
        }
    });
}
exports.default = main;
function doSingle(name, skipDownloads, client) {
    return __awaiter(this, void 0, void 0, function* () {
        const pkg = yield packages_1.AllPackages.readSingle(name);
        const record = yield search_index_generator_1.createSearchRecord(pkg, skipDownloads, client);
        console.log(verboseRecord(record));
    });
}
function verboseRecord(r) {
    return renameProperties(r, {
        t: "typePackageName",
        g: "globals",
        m: "declaredExternalModules",
        p: "projectName",
        l: "libraryName",
        d: "downloads",
        r: "redirect"
    });
}
function renameProperties(obj, replacers) {
    const out = {};
    for (const key of Object.getOwnPropertyNames(obj)) {
        out[replacers[key]] = obj[key];
    }
    return out;
}
//# sourceMappingURL=create-search-index.js.map