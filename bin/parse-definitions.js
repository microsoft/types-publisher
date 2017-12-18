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
const fs_extra_1 = require("fs-extra");
const path = require("path");
const yargs = require("yargs");
const common_1 = require("./lib/common");
const definition_parser_1 = require("./lib/definition-parser");
const definition_parser_worker_1 = require("./lib/definition-parser-worker");
const packages_1 = require("./lib/packages");
const test_runner_1 = require("./tester/test-runner");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const singleName = yargs.argv.single;
    util_1.done((singleName ? single(singleName, common_1.Options.defaults) : main(common_1.Options.defaults, test_runner_1.parseNProcesses())));
}
function main(options, nProcesses) {
    return __awaiter(this, void 0, void 0, function* () {
        const [summaryLog, summaryLogResult] = logging_1.logger();
        const [detailedLog, detailedLogResult] = logging_1.quietLogger();
        summaryLog("# Typing Publish Report Summary");
        summaryLog(`Started at ${(new Date()).toUTCString()}`);
        const packageNames = yield util_1.filterNAtATime(10, yield fs_extra_1.readdir(options.typesPath), (packageName) => __awaiter(this, void 0, void 0, function* () { return (yield fs_extra_1.stat(path.join(options.typesPath, packageName))).isDirectory(); }));
        summaryLog(`Found ${packageNames.length} typings folders in ${options.typesPath}`);
        const typings = {};
        yield util_1.runWithChildProcesses({
            inputs: packageNames,
            commandLineArgs: [options.typesPath],
            workerFile: definition_parser_worker_1.definitionParserWorkerFilename,
            nProcesses,
            handleOutput(output) {
                const { data, logs, packageName } = output;
                typings[packageName] = data;
                detailedLog(`# ${packageName}`);
                logging_1.moveLogs(detailedLog, logs);
            }
        });
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
        const result = yield definition_parser_1.getTypingInfo(singleName, options.typesPath);
        const typings = { [singleName]: result.data };
        yield common_1.writeDataFile(packages_1.typesDataFilename, typings);
        console.log(JSON.stringify(result, undefined, 4));
    });
}
//# sourceMappingURL=parse-definitions.js.map