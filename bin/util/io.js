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
const node_fetch_1 = require("node-fetch");
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
function fetchJson(url, init) {
    return __awaiter(this, void 0, void 0, function* () {
        // Cast needed: https://github.com/Microsoft/TypeScript/issues/10065
        const response = yield (init && init.retries ? fetchWithRetries(url, init) : node_fetch_1.default(url, init));
        return util_1.parseJson(yield response.text());
    });
}
exports.fetchJson = fetchJson;
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
        body += data.toString("utf8");
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
function fetchWithRetries(url, init) {
    return __awaiter(this, void 0, void 0, function* () {
        const maxRetries = init.retries === true ? 10 : init.retries;
        for (let retries = maxRetries; retries > 1; retries--) {
            try {
                return yield node_fetch_1.default(url, init);
            }
            catch (err) {
                if (!/EAI_AGAIN|ETIMEDOUT|ECONNRESET/.test(err.message)) {
                    throw err;
                }
            }
            yield sleep(1);
        }
        return node_fetch_1.default(url, init);
    });
}
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