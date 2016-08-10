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
const generator = require("./lib/package-generator");
const versions_1 = require("./lib/versions");
if (!module.parent) {
    if (!versions_1.default.existsSync()) {
        console.log("Run calculate-versions first!");
    }
    else if (!common_1.existsTypesDataFileSync()) {
        console.log("Run parse-definitions first!");
    }
    else {
        const singleName = yargs.argv.single;
        util_1.done((singleName ? single(singleName) : main()));
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const log = [];
        const { typeData, typings, versions } = yield loadPrerequisites();
        yield util_1.nAtATime(10, typings, (typing) => __awaiter(this, void 0, void 0, function* () {
            return logGeneration(typing, yield generator.generatePackage(typing, typeData, versions));
        }));
        yield util_1.nAtATime(10, yield common_1.readNotNeededPackages(), (pkg) => __awaiter(this, void 0, void 0, function* () {
            return logGeneration(pkg, yield generator.generateNotNeededPackage(pkg));
        }));
        yield common_1.writeLog("package-generator.md", log);
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
function single(singleName) {
    return __awaiter(this, void 0, void 0, function* () {
        const { typeData, typings, versions } = yield loadPrerequisites();
        const typing = typings.find(t => t.typingsPackageName === singleName);
        if (!typing) {
            throw new Error(`No package ${singleName} to generate.`);
        }
        const generateResult = yield generator.generatePackage(typing, typeData, versions);
        console.log(generateResult.log.join("\n"));
    });
}
function loadPrerequisites() {
    return __awaiter(this, void 0, void 0, function* () {
        const [typeData, versions] = yield Promise.all([yield common_1.readTypesDataFile(), yield versions_1.default.loadFromLocalFile()]);
        const typings = common_1.typingsFromData(typeData);
        return { typeData, typings, versions };
    });
}
//# sourceMappingURL=generate-packages.js.map