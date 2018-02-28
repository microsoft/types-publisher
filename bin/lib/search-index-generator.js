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
const settings_1 = require("./settings");
function createSearchRecord(pkg, skipDownloads, fetcher) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            p: pkg.projectName,
            l: pkg.libraryName,
            g: pkg.globals,
            t: pkg.name,
            m: pkg.declaredModules,
            d: yield getDownloads(),
            r: pkg.isNotNeeded() ? pkg.sourceRepoURL : undefined
        };
        // See https://github.com/npm/download-counts
        function getDownloads() {
            return __awaiter(this, void 0, void 0, function* () {
                if (skipDownloads) {
                    return -1;
                }
                else {
                    const json = yield fetcher.fetchJson({
                        hostname: settings_1.npmApi,
                        path: `/downloads/point/last-month/${pkg.name}`,
                        retries: true,
                    });
                    // Json may contain "error" instead of "downloads", because some packages aren't available on NPM.
                    return json.downloads || 0;
                }
            });
        }
    });
}
exports.createSearchRecord = createSearchRecord;
//# sourceMappingURL=search-index-generator.js.map