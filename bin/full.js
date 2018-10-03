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
const calculate_versions_1 = require("./calculate-versions");
const clean_1 = require("./clean");
const create_search_index_1 = require("./create-search-index");
const generate_packages_1 = require("./generate-packages");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const parse_definitions_1 = require("./parse-definitions");
const publish_packages_1 = require("./publish-packages");
const publish_registry_1 = require("./publish-registry");
const upload_blobs_1 = require("./upload-blobs");
const util_1 = require("./util/util");
const validate_1 = require("./validate");
if (!module.parent) {
    const dry = !!yargs.argv.dry;
    util_1.done(full(dry, util_1.currentTimeStamp(), common_1.Options.azure)); //->defaults
}
function full(dry, timeStamp, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const infoClient = new npm_client_1.UncachedNpmInfoClient();
        yield clean_1.default();
        const dt = yield get_definitely_typed_1.getDefinitelyTyped(options);
        const allPackages = yield parse_definitions_1.default(dt, options.parseInParallel
            ? { nProcesses: util_1.numberOfOsProcesses, definitelyTypedPath: util_1.assertDefined(options.definitelyTypedPath) }
            : undefined);
        const versions = yield calculate_versions_1.default(/*forceUpdate*/ false, dt, infoClient);
        yield generate_packages_1.default(dt, allPackages, versions);
        yield create_search_index_1.default(allPackages, infoClient);
        yield publish_packages_1.default(allPackages, versions, dry);
        yield publish_registry_1.default(dt, dry, infoClient);
        yield validate_1.default(dt);
        if (!dry) {
            yield upload_blobs_1.default(timeStamp);
        }
    });
}
exports.default = full;
//# sourceMappingURL=full.js.map