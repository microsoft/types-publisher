"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const check_parse_results_1 = require("../check-parse-results");
const clean_1 = require("../clean");
const get_definitely_typed_1 = require("../get-definitely-typed");
const npm_client_1 = require("../lib/npm-client");
const parse_definitions_1 = require("../parse-definitions");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const test_runner_1 = require("./test-runner");
if (!module.parent) {
    const options = test_runner_1.testerOptions(!!yargs.argv.runFromDefinitelyTyped);
    const all = !!yargs.argv.all;
    util_1.logUncaughtErrors(main(options, test_runner_1.parseNProcesses(), all));
}
async function main(options, nProcesses, all) {
    clean_1.default();
    const log = logging_1.loggerWithErrors()[0];
    const dt = await get_definitely_typed_1.getDefinitelyTyped(options, log);
    await parse_definitions_1.default(dt, { nProcesses, definitelyTypedPath: options.definitelyTypedPath }, log);
    await check_parse_results_1.default(/*includeNpmChecks*/ false, dt, options, new npm_client_1.UncachedNpmInfoClient());
    await test_runner_1.default(dt, options.definitelyTypedPath, nProcesses, all ? "all" : "affected");
}
//# sourceMappingURL=test.js.map