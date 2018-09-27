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
const get_definitely_typed_1 = require("../get-definitely-typed");
const npm_client_1 = require("../lib/npm-client");
const parse_definitions_1 = require("../parse-definitions");
const util_1 = require("../util/util");
const test_runner_1 = require("./test-runner");
if (!module.parent) {
    const options = test_runner_1.testerOptions(!!yargs.argv.runFromDefinitelyTyped);
    const all = !!yargs.argv.all;
    util_1.done(main(options, test_runner_1.parseNProcesses(), all));
}
function main(options, nProcesses, all) {
    return __awaiter(this, void 0, void 0, function* () {
        yield clean_1.default();
        const dt = yield get_definitely_typed_1.getDefinitelyTyped(options);
        yield parse_definitions_1.default(dt, { nProcesses, definitelyTypedPath: options.definitelyTypedPath });
        yield check_parse_results_1.default(/*includeNpmChecks*/ false, dt, options, new npm_client_1.UncachedNpmInfoClient());
        yield test_runner_1.default(dt, options.definitelyTypedPath, nProcesses, all ? "all" : "affected");
    });
}
//# sourceMappingURL=test.js.map