"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const yargs = require("yargs");
const common = require("./lib/common");
const versions_1 = require("./lib/versions");
const util_1 = require("./lib/util");
if (!module.parent) {
    if (!common.existsTypesDataFile()) {
        console.log("Run parse-definitions first!");
    }
    else {
        const forceUpdate = yargs.argv.forceUpdate;
        util_1.done(main(forceUpdate));
    }
}
function main(forceUpdate) {
    return __awaiter(this, void 0, void 0, function* () {
        const versions = yield versions_1.default.loadFromBlob();
        const changes = [];
        for (const typing of common.readTypings()) {
            if (versions.recordUpdate(typing, forceUpdate)) {
                changes.push(typing.typingsPackageName);
            }
        }
        yield versions.saveLocally();
        yield versions_1.writeChanges(changes);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
//# sourceMappingURL=calculate-versions.js.map