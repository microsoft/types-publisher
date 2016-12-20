"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fsp = require("fs-promise");
const path = require("path");
const common_1 = require("../lib/common");
const io_1 = require("../util/io");
const util_1 = require("../util/util");
const installsDir = "typescript-installs";
function installAllTypeScriptVersions() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Installing TypeScript versions...");
        yield fsp.mkdirp(installsDir);
        for (const version of common_1.TypeScriptVersion.All) {
            const dir = installDir(version);
            yield fsp.mkdirp(dir);
            io_1.writeJson(path.join(dir, "package.json"), packageJson(version));
            yield util_1.execAndThrowErrors("npm install", dir);
        }
    });
}
exports.installAllTypeScriptVersions = installAllTypeScriptVersions;
function pathToTsc(version) {
    return path.join(__dirname, "..", "..", installDir(version), "node_modules", "typescript", "lib", "tsc.js");
}
exports.pathToTsc = pathToTsc;
function installDir(version) {
    return path.join(installsDir, version);
}
function packageJson(version) {
    return {
        name: "ts-install",
        version: "0.0.0",
        dependencies: {
            typescript: `${version}.x`
        }
    };
}
//# sourceMappingURL=ts-installer.js.map