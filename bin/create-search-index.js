"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const yargs = require("yargs");
const common_1 = require("./lib/common");
const util_1 = require("./lib/util");
const search_index_generator_1 = require("./lib/search-index-generator");
if (!module.parent) {
    if (!common_1.existsTypesDataFile()) {
        console.log("Run parse-definitions first!");
    }
    else {
        const skipDownloads = yargs.argv.skipDownloads;
        util_1.done(main(skipDownloads));
    }
}
function main(skipDownloads) {
    return __awaiter(this, void 0, void 0, function* () {
        let packages = common_1.readTypings().concat(common_1.readNotNeededPackages());
        console.log(`Loaded ${packages.length} entries`);
        const records = yield util_1.nAtATime(100, packages, pkg => search_index_generator_1.createSearchRecord(pkg, skipDownloads));
        // Most downloads first
        records.sort((a, b) => b.downloads - a.downloads);
        console.log(`Done generating search index`);
        const minRecords = records.map(search_index_generator_1.minifySearchRecord);
        console.log(`Writing out data files`);
        common_1.writeDataFile("search-index-full.json", records);
        common_1.writeDataFile("search-index-min.json", minRecords, false);
        common_1.writeDataFile("search-index-head.json", minRecords.slice(0, 100), false);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
//# sourceMappingURL=create-search-index.js.map