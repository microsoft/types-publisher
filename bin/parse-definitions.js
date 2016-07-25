"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const parser = require("./lib/definition-parser");
const yargs = require("yargs");
const common_1 = require("./lib/common");
const util_1 = require("./lib/util");
const fsp = require("fs-promise");
if (!module.parent) {
    const singleName = yargs.argv.single;
    util_1.done((singleName ? single(singleName) : main()));
}
function processDir(name) {
    return __awaiter(this, void 0, void 0, function* () {
        let data;
        let outcome;
        const info = yield parser.getTypingInfo(name);
        const log = info.log;
        if (common_1.isSuccess(info)) {
            data = info.data;
            outcome = `Succeeded (${info.data.kind})`;
        }
        else if (common_1.isFail(info)) {
            data = undefined;
            outcome = `Failed (${common_1.RejectionReason[info.rejectionReason]})`;
        }
        return { data, log, warnings: info.warnings, outcome: outcome };
    });
}
function filterPaths(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        const fullPaths = paths
            .filter(s => s[0] !== "_" && s[0] !== "." && s !== "node_modules")
            .sort();
        // Remove non-folders
        return util_1.filterAsyncOrdered(fullPaths, (s) => __awaiter(this, void 0, void 0, function* () { return (yield fsp.stat(common_1.definitelyTypedPath(s))).isDirectory(); }));
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const summaryLog = [];
        const detailedLog = [];
        summaryLog.push("# Typing Publish Report Summary");
        summaryLog.push(`Started at ${(new Date()).toUTCString()}`);
        // TypesData
        const paths = yield fsp.readdir(common_1.settings.definitelyTypedPath);
        const folders = yield filterPaths(paths);
        summaryLog.push(`Found ${folders.length} typings folders in ${common_1.settings.definitelyTypedPath}`);
        const outcomes = {};
        const warningLog = [];
        const typings = {};
        for (const s of folders) {
            const result = yield processDir(s);
            // Record outcome
            outcomes[result.outcome] = (outcomes[result.outcome] || 0) + 1;
            detailedLog.push(`# ${s}`);
            // Push warnings
            if (result.warnings.length > 0) {
                warningLog.push(` * ${s}`);
                result.warnings.forEach(w => {
                    warningLog.push(`   * ${w}`);
                    detailedLog.push(`**Warning**: ${w}`);
                });
            }
            if (result.data !== undefined) {
                typings[s] = result.data;
            }
            // Flush detailed log
            result.log.forEach(e => detailedLog.push(e));
        }
        summaryLog.push("\r\n### Overall Results\r\n");
        summaryLog.push(" * Pass / fail");
        const outcomeKeys = Object.keys(outcomes);
        outcomeKeys.sort();
        outcomeKeys.forEach(k => {
            summaryLog.push(`   * ${k}: ${outcomes[k]}`);
        });
        summaryLog.push("\r\n### Warnings\r\n");
        warningLog.forEach(w => summaryLog.push(w));
        common_1.writeLogSync("parser-log-summary.md", summaryLog);
        common_1.writeLogSync("parser-log-details.md", detailedLog);
        common_1.writeDataFile(common_1.typesDataFilename, typings);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function single(singleName) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield processDir(singleName);
        const typings = { [singleName]: result.data };
        common_1.writeDataFile(common_1.typesDataFilename, typings);
        console.log(result);
    });
}
//# sourceMappingURL=parse-definitions.js.map