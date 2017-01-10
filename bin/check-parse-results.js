"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const semver = require("semver");
const common_1 = require("./lib/common");
const packages_1 = require("./lib/packages");
const settings_1 = require("./lib/settings");
const logging_1 = require("./util/logging");
const io_1 = require("./util/io");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(true, common_1.Options.defaults));
}
function main(includeNpmChecks, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const packages = yield packages_1.AllPackages.readTypings();
        const [log, logResult] = logging_1.logger();
        check(packages, info => info.libraryName, "Library Name", log);
        check(packages, info => info.projectName, "Project Name", log);
        if (includeNpmChecks) {
            yield util_1.nAtATime(10, packages, pkg => checkNpm(pkg, log), {
                name: "Checking for typed packages...",
                flavor: pkg => pkg.desc,
                options
            });
        }
        yield logging_1.writeLog("conflicts.md", logResult());
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function check(infos, func, key, log) {
    const lookup = new Map();
    for (const info of infos) {
        const libraryOrProjectName = func(info);
        if (libraryOrProjectName !== undefined) {
            util_1.multiMapAdd(lookup, libraryOrProjectName, info);
        }
    }
    for (const [libName, values] of lookup) {
        if (values.length > 1) {
            log(` * Duplicate ${key} descriptions "${libName}"`);
            for (const n of values) {
                log(`   * ${n.desc}`);
            }
        }
    }
}
function checkNpm(pkg, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const asOfVersion = yield firstPackageVersionWithTypes(pkg.name);
        if (asOfVersion) {
            const ourVersion = `${pkg.major}.${pkg.minor}`;
            log(`Typings already defined for ${pkg.name} (${pkg.libraryName}) as of ${asOfVersion} (our version: ${ourVersion})`);
        }
    });
}
function packageHasTypes(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield firstPackageVersionWithTypes(packageName)) !== undefined;
    });
}
exports.packageHasTypes = packageHasTypes;
function firstPackageVersionWithTypes(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = settings_1.npmRegistry + packageName;
        const info = yield io_1.fetchJson(uri, { retries: true });
        // Info may be empty if the package is not on NPM
        if (!info.versions) {
            return undefined;
        }
        return firstVersionWithTypes(info.versions);
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