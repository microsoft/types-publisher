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
const fs_extra_1 = require("fs-extra");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main());
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        for (const dir of ["data", "logs", "output"]) {
            console.log(`Clean ${dir}`);
            yield fs_extra_1.remove(dir);
        }
    });
}
exports.default = main;
//# sourceMappingURL=clean.js.map