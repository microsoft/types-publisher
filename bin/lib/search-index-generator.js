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
function createSearchRecord(pkg, client) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            p: pkg.projectName,
            l: pkg.libraryName,
            g: pkg.globals,
            t: pkg.name,
            m: pkg.declaredModules,
            d: yield client.getDownloads(pkg.name),
            r: pkg.isNotNeeded() ? pkg.sourceRepoURL : undefined
        };
    });
}
exports.createSearchRecord = createSearchRecord;
//# sourceMappingURL=search-index-generator.js.map