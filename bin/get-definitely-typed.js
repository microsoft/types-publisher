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
const https = require("https");
const tar = require("tar-fs");
const zlib = require("zlib");
const common_1 = require("./lib/common");
const settings_1 = require("./lib/settings");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(common_1.Options.azure));
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options.downloadDefinitelyTyped) {
            yield fs_extra_1.ensureDir(common_1.dataDir);
            yield fs_extra_1.remove(options.definitelyTypedPath);
            yield downloadAndExtractFile(settings_1.definitelyTypedZipUrl, options.definitelyTypedPath);
        }
        else {
            const { error, stderr, stdout } = yield util_1.exec("git diff --name-only", options.definitelyTypedPath);
            if (error) {
                throw error;
            }
            if (stderr) {
                throw new Error(stderr);
            }
            if (stdout) {
                throw new Error(`'git diff' should be empty. Following files changed:\n${stdout}`);
            }
        }
    });
}
exports.default = main;
function downloadAndExtractFile(url, outDirectoryPath) {
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            const tarOut = tar.extract(outDirectoryPath, {
                map: header => (Object.assign({}, header, { name: util_1.assertDefined(util_1.withoutStart(header.name, "DefinitelyTyped-master/")) })),
            });
            response.pipe(zlib.createGunzip()).pipe(tarOut);
            tarOut.on("error", reject);
            tarOut.on("finish", () => {
                resolve();
            });
        }).on("error", reject);
    });
}
//# sourceMappingURL=get-definitely-typed.js.map