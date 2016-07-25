"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const common = require("./lib/common");
const util_1 = require("./lib/util");
const generator = require("./lib/package-generator");
const versions_1 = require("./lib/versions");
if (!module.parent) {
    if (!versions_1.default.existsSync()) {
        console.log("Run calculate-versions first!");
    }
    else {
        util_1.done(main());
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const log = [];
        const typeData = common.readTypesDataFile();
        const typings = common.typings(typeData);
        const versions = yield versions_1.default.loadFromLocalFile();
        yield util_1.nAtATime(10, typings, (typing) => __awaiter(this, void 0, void 0, function* () {
            return logGeneration(typing, yield generator.generatePackage(typing, typeData, versions));
        }));
        yield util_1.nAtATime(10, common.readNotNeededPackages(), (pkg) => __awaiter(this, void 0, void 0, function* () {
            return logGeneration(pkg, yield generator.generateNotNeededPackage(pkg));
        }));
        common.writeLogSync("package-generator.md", log);
        function logGeneration(pkg, generateResult) {
            return __awaiter(this, void 0, void 0, function* () {
                log.push(` * ${pkg.libraryName}`);
                generateResult.log.forEach(line => log.push(`   * ${line}`));
            });
        }
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
//# sourceMappingURL=generate-packages.js.map