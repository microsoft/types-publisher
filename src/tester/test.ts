import yargs = require("yargs");

import checkParseResults from "../check-parse-results";
import clean from "../clean";
import { Options } from "../lib/common";
import parseDefinitions from "../parse-definitions";
import { done } from "../util/util";

import runTests, { parseNProcesses, testerOptions } from "./test-runner";

if (!module.parent) {
	const all = !!yargs.argv.all;
	const options = testerOptions(!!yargs.argv.runFromDefinitelyTyped);
	done(main(options, parseNProcesses(), all));
}

async function main(options: Options, nProcesses: number | undefined, all: boolean): Promise<void> {
	await clean();
	await parseDefinitions(options);
	await checkParseResults(/*includeNpmChecks*/false, options);
	await runTests(options, nProcesses, all ? new RegExp(/./) : undefined);
}
