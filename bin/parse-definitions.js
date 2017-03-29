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
const parser = require("./lib/definition-parser");
const packages_1 = require("./lib/packages");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
const fsp = require("fs-promise");
if (!module.parent) {
    const singleName = yargs.argv.single;
    util_1.done((singleName ? single(singleName, common_1.Options.defaults) : main(common_1.Options.defaults)));
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [summaryLog, summaryLogResult] = logging_1.logger();
        const [detailedLog, detailedLogResult] = logging_1.quietLogger();
        summaryLog("# Typing Publish Report Summary");
        summaryLog(`Started at ${(new Date()).toUTCString()}`);
        const packageNames = yield fsp.readdir(options.typesPath);
        summaryLog(`Found ${packageNames.length} typings folders in ${options.typesPath}`);
        const typings = {};
        yield util_1.nAtATime(1, packageNames, use, { name: "Parsing...", flavor: name => name, options });
        function use(packageName) {
            return __awaiter(this, void 0, void 0, function* () {
                if (packageName === "tslint.json") {
                    return;
                }
                const { data, logs } = yield parser.getTypingInfo(packageName, options);
                typings[packageName] = data;
                // Flush detailed log
                detailedLog(`# ${packageName}`);
                logging_1.moveLogs(detailedLog, logs);
            });
        }
        yield Promise.all([
            logging_1.writeLog("parser-log-summary.md", summaryLogResult()),
            logging_1.writeLog("parser-log-details.md", detailedLogResult()),
            common_1.writeDataFile(packages_1.typesDataFilename, typings)
        ]);
    });
}
exports.default = main;
function single(singleName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield parser.getTypingInfo(singleName, options);
        const typings = { [singleName]: result.data };
        yield common_1.writeDataFile(packages_1.typesDataFilename, typings);
        console.log(JSON.stringify(result, undefined, 4));
    });
}
//# sourceMappingURL=parse-definitions.js.map