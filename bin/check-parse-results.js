"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const semver = require("semver");
const common_1 = require("./lib/common");
const logging_1 = require("./util/logging");
const io_1 = require("./util/io");
const util_1 = require("./util/util");
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
        yield util_1.nAtATime(10, infos, pkg => checkNpm(pkg, log));
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
function checkNpm(pkg, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = common_1.settings.npmRegistry + pkg.typingsPackageName;
        const info = yield io_1.fetchJson(uri, { retries: true });
        // Info may be empty if the package is not on NPM
        if (!info.versions) {
            return;
        }
        const asOfVersion = firstVersionWithTypes(info.versions);
        if (asOfVersion) {
            const ourVersion = `${pkg.libraryMajorVersion}.${pkg.libraryMinorVersion}`;
            log(`Typings already defined for ${pkg.typingsPackageName} (${pkg.libraryName}) as of ${asOfVersion} (our version: ${ourVersion})`);
        }
    });
}
function firstVersionWithTypes(versions) {
    const versionsWithTypings = Object.entries(versions).filter(([_version, info]) => hasTypes(info)).map(([version]) => version);
    return util_1.best(versionsWithTypings, semver.lt);
}
function hasTypes(info) {
    return "types" in info || "typings" in info;
}
//# sourceMappingURL=check-parse-results.js.map