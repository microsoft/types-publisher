"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definitionParserWorkerFilename = void 0;
const assert = require("assert");
const process = require("process");
const get_definitely_typed_1 = require("../get-definitely-typed");
const util_1 = require("../util/util");
const definition_parser_1 = require("./definition-parser");
// This file is "called" by runWithChildProcesses from parse-definition.ts
exports.definitionParserWorkerFilename = __filename;
if (!module.parent) {
    process.on("message", message => {
        assert(process.argv.length === 3);
        const typesPath = process.argv[2];
        // tslint:disable-next-line no-async-without-await
        util_1.logUncaughtErrors(async () => {
            for (const packageName of message) {
                const data = definition_parser_1.getTypingInfo(packageName, get_definitely_typed_1.getLocallyInstalledDefinitelyTyped(typesPath).subDir(packageName));
                process.send({ data, packageName });
            }
        });
    });
}
//# sourceMappingURL=definition-parser-worker.js.map