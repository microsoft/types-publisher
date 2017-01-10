"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const yargs = require("yargs");
const parser = require("./lib/definition-parser");
const common_1 = require("./lib/common");
const packages_1 = require("./lib/packages");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
const fsp = require("fs-promise");
if (!module.parent) {
    const singleName = yargs.argv.single;
    util_1.done((singleName ? single(singleName, common_1.Options.defaults) : main(common_1.Options.defaults)));
}
function filterPaths(paths, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const fullPaths = paths
            .filter(s => s[0] !== "." && s[0] !== "_" && common_1.isTypingDirectory(s))
            .sort();
        // Remove non-folders
        return util_1.filterAsyncOrdered(fullPaths, (s) => __awaiter(this, void 0, void 0, function* () { return (yield fsp.stat(packages_1.packageRootPath(s, options))).isDirectory(); }));
    });
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [summaryLog, summaryLogResult] = logging_1.logger();
        const [detailedLog, detailedLogResult] = logging_1.quietLogger();
        summaryLog("# Typing Publish Report Summary");
        summaryLog(`Started at ${(new Date()).toUTCString()}`);
        const packageNames = yield filterPaths(yield fsp.readdir(options.definitelyTypedPath), options);
        summaryLog(`Found ${packageNames.length} typings folders in ${options.definitelyTypedPath}`);
        const typings = {};
        yield util_1.nAtATime(1, packageNames, use, { name: "Parsing...", flavor: name => name, options });
        function use(packageName) {
            return __awaiter(this, void 0, void 0, function* () {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function single(singleName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield parser.getTypingInfo(singleName, options);
        const typings = { [singleName]: result.data };
        yield common_1.writeDataFile(packages_1.typesDataFilename, typings);
        console.log(result);
    });
}
//# sourceMappingURL=parse-definitions.js.map