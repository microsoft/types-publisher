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
const fs = require("fs");
const fs_extra_1 = require("fs-extra");
const https = require("https");
const StreamZip = require("node-stream-zip");
const common_1 = require("./lib/common");
const settings_1 = require("./lib/settings");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main(common_1.Options.defaults));
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options.downloadDefinitelyTyped) {
            yield fs_extra_1.ensureDir(common_1.dataDir);
            const zipPath = `${options.definitelyTypedPath}.zip`;
            yield downloadFile(settings_1.definitelyTypedZipUrl, zipPath);
            yield fs_extra_1.remove(options.definitelyTypedPath);
            yield extract(zipPath, options.definitelyTypedPath);
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
function downloadFile(url, outFilePath) {
    const file = fs.createWriteStream(outFilePath);
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            response.pipe(file);
            file.on("finish", () => {
                file.close();
                resolve();
            });
        }).on("error", reject);
    });
}
function extract(zipFilePath, outDirectoryPath) {
    return new Promise((resolve, reject) => {
        const zip = new StreamZip({ file: zipFilePath });
        zip.on("error", reject);
        zip.on("ready", () => {
            fs.mkdirSync(outDirectoryPath);
            zip.extract(undefined, outDirectoryPath, err => {
                zip.close();
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
//# sourceMappingURL=get-definitely-typed.js.map