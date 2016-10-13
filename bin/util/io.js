"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require("assert");
const fetch = require("node-fetch");
const path = require("path");
const recursiveReaddir = require("recursive-readdir");
const fsp = require("fs-promise");
const stream = require("stream");
const util_1 = require("./util");
function readdirRecursive(dirPath, keepIf) {
    function relativePath(file) {
        const prefix = dirPath + path.sep;
        assert(file.startsWith(prefix));
        return util_1.normalizeSlashes(file.slice(prefix.length));
    }
    function ignoreRelative(file, stats) {
        return !keepIf(relativePath(file), stats);
    }
    return new Promise((resolve, reject) => {
        recursiveReaddir(dirPath, [ignoreRelative], (err, files) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(files.map(relativePath));
            }
        });
    });
}
exports.readdirRecursive = readdirRecursive;
function readFile(path) {
    return fsp.readFile(path, { encoding: "utf8" });
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
        const response = yield (init && init.retries ? fetchWithRetries(url, init) : fetch(url, init));
        return util_1.parseJson(yield response.text());
    });
}
exports.fetchJson = fetchJson;
function writeFile(path, content) {
    return fsp.writeFile(path, content, { encoding: "utf8" });
}
exports.writeFile = writeFile;
function writeJson(path, content) {
    return writeFile(path, JSON.stringify(content, undefined, 4));
}
exports.writeJson = writeJson;
function streamOfString(text) {
    const s = new stream.Readable();
    s.push(text);
    s.push(null);
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
        stream.on("end", () => resolve(body));
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
        for (let retries = init.retries === true ? 5 : init.retries; retries > 1; retries--) {
            try {
                return yield fetch(url, init);
            }
            catch (err) {
                if (!/ETIMEDOUT|ECONNRESET/.test(err.message)) {
                    throw err;
                }
            }
        }
        return yield fetch(url);
    });
}
//# sourceMappingURL=io.js.map