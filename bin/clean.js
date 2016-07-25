"use strict";
const rimraf = require("rimraf");
if (!module.parent) {
    main();
}
function main() {
    for (const dir of ["data", "logs", "output"]) {
        console.log("Clean " + dir);
        rimraf.sync(dir);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
//# sourceMappingURL=clean.js.map