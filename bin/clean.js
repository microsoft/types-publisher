"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main());
}
async function main() {
    for (const dir of ["data", "logs", "output"]) {
        console.log(`Clean ${dir}`);
        await fs_extra_1.remove(dir);
    }
}
exports.default = main;
//# sourceMappingURL=clean.js.map