"use strict";
const fsp = require("fs-promise");
if (!module.parent) {
    main();
}
function main() {
    for (const dir of ["data", "logs", "output"]) {
        console.log("Clean " + dir);
        fsp.remove(dir);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
//# sourceMappingURL=clean.js.map