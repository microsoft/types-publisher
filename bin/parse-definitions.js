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
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const definition_parser_1 = require("./lib/definition-parser");
const definition_parser_worker_1 = require("./lib/definition-parser-worker");
const packages_1 = require("./lib/packages");
const test_runner_1 = require("./tester/test-runner");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const singleName = yargs.argv.single;
    const options = common_1.Options.defaults;
    util_1.done(get_definitely_typed_1.getDefinitelyTyped(options).then(dt => singleName ? single(singleName, dt)
        : main(dt, options.parseInParallel
            ? { nProcesses: test_runner_1.parseNProcesses(), definitelyTypedPath: util_1.assertDefined(options.definitelyTypedPath) }
            : undefined)));
}
function main(fs, parallel) {
    return __awaiter(this, void 0, void 0, function* () {
        const [summaryLog, summaryLogResult] = logging_1.logger();
        const [detailedLog, detailedLogResult] = logging_1.quietLogger();
        summaryLog("# Typing Publish Report Summary");
        summaryLog(`Started at ${(new Date()).toUTCString()}`);
        const typesFS = fs.subDir("types");
        const packageNames = yield util_1.filterNAtATime(parallel ? parallel.nProcesses : 1, yield typesFS.readdir(), name => typesFS.isDirectory(name));
        summaryLog(`Found ${packageNames.length} typings folders`);
        const typings = {};
        if (parallel) {
            yield util_1.runWithChildProcesses({
                inputs: packageNames,
                commandLineArgs: [`${parallel.definitelyTypedPath}/types`],
                workerFile: definition_parser_worker_1.definitionParserWorkerFilename,
                nProcesses: parallel.nProcesses,
                handleOutput,
            });
        }
        else {
            for (const packageName of packageNames) {
                handleOutput(Object.assign({}, yield definition_parser_1.getTypingInfo(packageName, typesFS.subDir(packageName)), { packageName }));
            }
        }
        function handleOutput({ data, logs, packageName }) {
            typings[packageName] = data;
            detailedLog(`# ${packageName}`);
            logging_1.moveLogs(detailedLog, logs);
        }
        yield Promise.all([
            logging_1.writeLog("parser-log-summary.md", summaryLogResult()),
            logging_1.writeLog("parser-log-details.md", detailedLogResult()),
            common_1.writeDataFile(packages_1.typesDataFilename, sorted(typings)),
        ]);
    });
}
exports.default = main;
function sorted(obj) {
    const out = {};
    for (const key of Object.keys(obj).sort()) {
        out[key] = obj[key];
    }
    return out;
}
function single(singleName, dt) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield definition_parser_1.getTypingInfo(singleName, dt.subDir(`types/${singleName}`));
        const typings = { [singleName]: result.data };
        yield common_1.writeDataFile(packages_1.typesDataFilename, typings);
        console.log(JSON.stringify(result, undefined, 4));
    });
}
//# sourceMappingURL=parse-definitions.js.map