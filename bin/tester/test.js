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
const check_parse_results_1 = require("../check-parse-results");
const clean_1 = require("../clean");
const parse_definitions_1 = require("../parse-definitions");
const util_1 = require("../util/util");
const test_runner_1 = require("./test-runner");
if (!module.parent) {
    const options = test_runner_1.testerOptions(!!yargs.argv.runFromDefinitelyTyped);
    const tsNext = !!yargs.argv.tsNext;
    const all = !!yargs.argv.all;
    util_1.done(main(options, test_runner_1.parseNProcesses(), all, tsNext));
}
function main(options, nProcesses, all, tsNext) {
    return __awaiter(this, void 0, void 0, function* () {
        yield clean_1.default();
        yield parse_definitions_1.default(options);
        yield check_parse_results_1.default(/*includeNpmChecks*/ false, options);
        yield test_runner_1.default(options, nProcesses, all ? "all" : "affected", tsNext);
    });
}
//# sourceMappingURL=test.js.map