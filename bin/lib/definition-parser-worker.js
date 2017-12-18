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
const assert = require("assert");
const process = require("process");
const util_1 = require("../util/util");
const definition_parser_1 = require("./definition-parser");
if (!module.parent) {
    process.on("message", message => {
        assert(process.argv.length === 3);
        const typesPath = process.argv[2];
        util_1.done(go(message, typesPath));
    });
}
exports.definitionParserWorkerFilename = __filename;
function go(packageNames, typesPath) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const packageName of packageNames) {
            const info = yield definition_parser_1.getTypingInfo(packageName, typesPath);
            const result = Object.assign({}, info, { packageName });
            process.send(result);
        }
    });
}
//# sourceMappingURL=definition-parser-worker.js.map