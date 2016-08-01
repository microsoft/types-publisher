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
const clean_1 = require("./clean");
const get_definitely_typed_1 = require("./get-definitely-typed");
const parse_definitions_1 = require("./parse-definitions");
const check_parse_results_1 = require("./check-parse-results");
const calculate_versions_1 = require("./calculate-versions");
const generate_packages_1 = require("./generate-packages");
const create_search_index_1 = require("./create-search-index");
const publish_packages_1 = require("./publish-packages");
const upload_blobs_1 = require("./upload-blobs");
const npm_client_1 = require("./lib/npm-client");
const util_1 = require("./lib/util");
if (!module.parent) {
    const dry = !!yargs.argv.dry;
    util_1.done(npm_client_1.default.create()
        .then(client => full(client, dry, util_1.currentTimeStamp())));
}
function full(client, dry, timeStamp) {
    return __awaiter(this, void 0, void 0, function* () {
        yield clean_1.default();
        yield get_definitely_typed_1.default();
        yield parse_definitions_1.default();
        yield check_parse_results_1.default();
        yield calculate_versions_1.default(/*forceUpdate*/ false);
        yield generate_packages_1.default();
        yield create_search_index_1.default(/*skipDownloads*/ false, /*full*/ false);
        yield publish_packages_1.default(client, dry);
        if (!dry) {
            yield upload_blobs_1.default(timeStamp);
        }
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = full;
//# sourceMappingURL=full.js.map