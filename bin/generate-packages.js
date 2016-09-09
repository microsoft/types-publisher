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
const package_generator_1 = require("./lib/package-generator");
const versions_1 = require("./lib/versions");
if (!module.parent) {
    if (!versions_1.default.existsSync()) {
        console.log("Run calculate-versions first!");
    }
    else if (!common_1.existsTypesDataFileSync()) {
        console.log("Run parse-definitions first!");
    }
    else {
        const all = yargs.argv.all;
        const singleName = yargs.argv.single;
        if (all && singleName) {
            throw new Error("Select only one of -single=foo or --all.");
        }
        util_1.done((singleName ? single(singleName) : main(all)));
    }
}
function main(all = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.logger();
        log(`\n## Generating ${all ? "all" : "changed"} packages\n`);
        const { typeData, allPackages, versions } = yield loadPrerequisites();
        const packages = all ? allPackages : yield changedPackages(allPackages);
        yield util_1.nAtATime(10, packages, (pkg) => __awaiter(this, void 0, void 0, function* () {
            const logs = yield package_generator_1.default(pkg, typeData, versions);
            log(` * ${pkg.libraryName}`);
            logging_1.moveLogs(log, logs, line => `   * ${line}`);
        }));
        yield logging_1.writeLog("package-generator.md", logResult());
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function single(singleName) {
    return __awaiter(this, void 0, void 0, function* () {
        const { typeData, allPackages, versions } = yield loadPrerequisites();
        const pkg = allPackages.find(t => t.typingsPackageName === singleName);
        if (!pkg) {
            throw new Error(`No package ${singleName} to generate.`);
        }
        const logs = yield package_generator_1.default(pkg, typeData, versions);
        console.log(logs.join("\n"));
    });
}
function loadPrerequisites() {
    return __awaiter(this, void 0, void 0, function* () {
        const [typeData, notNeededPackages, versions] = yield Promise.all([yield common_1.readTypesDataFile(), yield common_1.readNotNeededPackages(), yield versions_1.default.loadFromLocalFile()]);
        const typings = common_1.typingsFromData(typeData);
        const allPackages = typings.concat(notNeededPackages);
        return { typeData, allPackages, versions };
    });
}
function changedPackages(allPackages) {
    return __awaiter(this, void 0, void 0, function* () {
        const changes = yield versions_1.readChanges();
        return changes.map(changedPackageName => {
            const pkg = allPackages.find(p => p.typingsPackageName === changedPackageName);
            if (pkg === undefined) {
                throw new Error(`Expected to find a package named ${changedPackageName}`);
            }
            return pkg;
        });
    });
}
//# sourceMappingURL=generate-packages.js.map