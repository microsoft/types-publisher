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
const logging_1 = require("./lib/logging");
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
        const [log, logResult] = logging_1.logger();
        log("\n## Generating packages\n");
        const { typeData, typings, notNeededPackages, versions } = yield loadPrerequisites();
        yield util_1.nAtATime(10, typings, (typing) => __awaiter(this, void 0, void 0, function* () {
            return logGeneration(typing, yield generator.generatePackage(typing, typeData, versions));
        }));
        yield util_1.nAtATime(10, notNeededPackages, (pkg) => __awaiter(this, void 0, void 0, function* () {
            return logGeneration(pkg, yield generator.generateNotNeededPackage(pkg));
        }));
        yield logging_1.writeLog("package-generator.md", logResult());
        function logGeneration(pkg, logs) {
            return __awaiter(this, void 0, void 0, function* () {
                log(` * ${pkg.libraryName}`);
                logging_1.moveLogs(log, logs, line => `   * ${line}`);
            });
        }
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function single(singleName) {
    return __awaiter(this, void 0, void 0, function* () {
        const { typeData, typings, notNeededPackages, versions } = yield loadPrerequisites();
        let generateResult;
        const typing = typings.find(t => t.typingsPackageName === singleName);
        if (typing) {
            generateResult = yield generator.generatePackage(typing, typeData, versions);
        }
        if (!typing) {
            const notNeededPackage = notNeededPackages.find(t => t.typingsPackageName === singleName);
            if (!notNeededPackage) {
                throw new Error(`No package ${singleName} to generate.`);
            }
            generateResult = yield generator.generateNotNeededPackage(notNeededPackage);
        }
        console.log(generateResult.join("\n"));
    });
}
function loadPrerequisites() {
    return __awaiter(this, void 0, void 0, function* () {
        const [typeData, notNeededPackages, versions] = yield Promise.all([yield common_1.readTypesDataFile(), yield common_1.readNotNeededPackages(), yield versions_1.default.loadFromLocalFile()]);
        const typings = common_1.typingsFromData(typeData);
        return { typeData, typings, notNeededPackages, versions };
    });
}
//# sourceMappingURL=generate-packages.js.map