"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const common_1 = require("./lib/common");
const logging_1 = require("./lib/logging");
const util_1 = require("./lib/util");
if (!module.parent) {
    if (!common_1.existsTypesDataFileSync()) {
        console.log("Run parse-definitions first!");
    }
    else {
        util_1.done(main());
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const infos = yield common_1.readTypings();
        const [log, logResult] = logging_1.logger();
        check(infos, info => info.libraryName, "Library Name", log);
        check(infos, info => info.projectName, "Project Name", log);
        yield logging_1.writeLog("conflicts.md", logResult());
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function check(infos, func, key, log) {
    const lookup = {};
    infos.forEach(info => {
        const name = func(info);
        if (name !== undefined) {
            (lookup[name] || (lookup[name] = [])).push(info.typingsPackageName);
        }
    });
    for (const k of Object.keys(lookup)) {
        if (lookup[k].length > 1) {
            log(` * Duplicate ${key} descriptions "${k}"`);
            lookup[k].forEach(n => log(`   * ${n}`));
        }
    }
}
//# sourceMappingURL=check-parse-results.js.map