"use strict";
const common_1 = require("./lib/common");
if (!module.parent) {
    if (!common_1.existsTypesDataFile()) {
        console.log("Run parse-definitions first!");
    }
    else {
        main();
    }
}
function main() {
    const libConflicts = check(info => info.libraryName, "Library Name");
    const projConflicts = check(info => info.projectName, "Project Name");
    common_1.writeLogSync("conflicts.md", libConflicts.concat(projConflicts));
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function check(func, key) {
    const lookup = {};
    const infos = common_1.readTypings();
    const result = [];
    infos.forEach(info => {
        const name = func(info);
        if (name !== undefined) {
            (lookup[name] || (lookup[name] = [])).push(info.typingsPackageName);
        }
    });
    for (const k of Object.keys(lookup)) {
        if (lookup[k].length > 1) {
            result.push(` * Duplicate ${key} descriptions "${k}"`);
            lookup[k].forEach(n => result.push(`   * ${n}`));
        }
    }
    return result;
}
//# sourceMappingURL=check-parse-results.js.map