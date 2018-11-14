"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const process = require("process");
const get_definitely_typed_1 = require("../get-definitely-typed");
const util_1 = require("../util/util");
const definition_parser_1 = require("./definition-parser");
if (!module.parent) {
    process.on("message", message => {
        assert(process.argv.length === 3);
        const typesPath = process.argv[2];
        util_1.logUncaughtErrors(go(message, typesPath));
    });
}
exports.definitionParserWorkerFilename = __filename;
async function go(packageNames, typesPath) {
    for (const packageName of packageNames) {
        const data = await definition_parser_1.getTypingInfo(packageName, get_definitely_typed_1.getLocallyInstalledDefinitelyTyped(typesPath).subDir(packageName));
        const result = { data, packageName };
        process.send(result);
    }
}
//# sourceMappingURL=definition-parser-worker.js.map