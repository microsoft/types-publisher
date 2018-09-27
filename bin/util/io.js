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
const assert = require("assert");
const fs_extra_1 = require("fs-extra");
const https_1 = require("https");
const path_1 = require("path");
const stream = require("stream");
const util_1 = require("./util");
function readFile(path) {
    return fs_extra_1.readFile(path, { encoding: "utf8" });
}
exports.readFile = readFile;
function readJson(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return util_1.parseJson(yield readFile(path));
    });
}
exports.readJson = readJson;
function writeFile(path, content) {
    return fs_extra_1.writeFile(path, content, { encoding: "utf8" });
}
exports.writeFile = writeFile;
function writeJson(path, content, formatted = true) {
    return fs_extra_1.writeJson(path, content, { spaces: formatted ? 4 : 0 });
}
exports.writeJson = writeJson;
function streamOfString(text) {
    const s = new stream.Readable();
    s.push(text);
    s.push(null); // tslint:disable-line no-null-keyword
    return s;
}
exports.streamOfString = streamOfString;
function stringOfStream(stream) {
    let body = "";
    stream.on("data", (data) => {
        body += data.toString();
    });
    return new Promise((resolve, reject) => {
        stream.on("error", reject);
        stream.on("end", () => { resolve(body); });
    });
}
exports.stringOfStream = stringOfStream;
function streamDone(stream) {
    return new Promise((resolve, reject) => {
        stream.on("error", reject).on("finish", resolve);
    });
}
exports.streamDone = streamDone;
class Fetcher {
    constructor() {
        this.agent = new https_1.Agent({ keepAlive: true });
    }
    fetchJson(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const text = yield this.fetch(options);
            try {
                return JSON.parse(text);
            }
            catch (e) {
                throw new Error(`Bad response from server:\noptions: ${options}\n\n${text}`);
            }
        });
    }
    fetch(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxRetries = options.retries === false || options.retries === undefined ? 0 : options.retries === true ? 10 : options.retries;
            for (let retries = maxRetries; retries > 1; retries--) {
                try {
                    return yield this.fetchOnce(options);
                }
                catch (err) {
                    if (!/EAI_AGAIN|ETIMEDOUT|ECONNRESET/.test(err.message)) {
                        throw err;
                    }
                }
                yield sleep(1);
            }
            return this.fetchOnce(options);
        });
    }
    fetchOnce(options) {
        return new Promise((resolve, reject) => {
            const req = https_1.request({
                hostname: options.hostname,
                port: options.port,
                path: `/${options.path}`,
                agent: this.agent,
                method: options.method || "GET",
                headers: options.headers,
            }, res => {
                let text = "";
                res.on("data", (d) => { text += d; });
                res.on("error", reject);
                res.on("end", () => { resolve(text); });
            });
            if (options.body !== undefined) {
                req.write(options.body);
            }
            req.end();
        });
    }
}
exports.Fetcher = Fetcher;
function sleep(seconds) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    });
}
exports.sleep = sleep;
function isDirectory(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield fs_extra_1.stat(path)).isDirectory();
    });
}
exports.isDirectory = isDirectory;
function assertDirectoriesEqual(expected, actual, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const expectedLs = yield fs_extra_1.readdir(expected);
        const actualLs = yield fs_extra_1.readdir(actual);
        assert.deepEqual(expectedLs, actualLs);
        for (const name of expectedLs) {
            if (options.ignore(name)) {
                continue;
            }
            const expectedFile = path_1.join(expected, name);
            const actualFile = path_1.join(actual, name);
            const expectedStat = yield fs_extra_1.stat(expectedFile);
            const actualStat = yield fs_extra_1.stat(actualFile);
            assert.equal(expectedStat.isDirectory(), actualStat.isDirectory());
            if (expectedStat.isDirectory()) {
                yield assertDirectoriesEqual(expectedFile, actualFile, options);
            }
            else {
                assert.equal(yield readFile(actualFile), yield readFile(expectedFile));
            }
        }
    });
}
exports.assertDirectoriesEqual = assertDirectoriesEqual;
exports.npmInstallFlags = "--ignore-scripts --no-shrinkwrap --no-package-lock --no-bin-links --no-save";
//# sourceMappingURL=io.js.map