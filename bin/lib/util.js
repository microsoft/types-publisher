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
const moment = require("moment");
const path = require("path");
const recursiveReaddir = require("recursive-readdir");
const fsp = require("fs-promise");
const stream = require("stream");
const zlib = require("zlib");
function parseJson(text) {
    try {
        return JSON.parse(text);
    }
    catch (err) {
        throw new Error(`${err.message} due to JSON: ${text}`);
    }
}
exports.parseJson = parseJson;
function currentTimeStamp() {
    return moment().format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
}
exports.currentTimeStamp = currentTimeStamp;
function nAtATime(n, input, use) {
    return __awaiter(this, void 0, void 0, function* () {
        let res = [];
        for (let i = 0; i < input.length; i += n) {
            const thisInputs = input.slice(i, i + n);
            const thisBatch = yield Promise.all(thisInputs.map(use));
            res.push(...thisBatch);
        }
        return res;
    });
}
exports.nAtATime = nAtATime;
function filterAsyncOrdered(arr, shouldKeep) {
    return __awaiter(this, void 0, void 0, function* () {
        const shouldKeeps = yield Promise.all(arr.map(shouldKeep));
        return arr.filter((_, idx) => shouldKeeps[idx]);
    });
}
exports.filterAsyncOrdered = filterAsyncOrdered;
function mapAsyncOrdered(arr, mapper) {
    return __awaiter(this, void 0, void 0, function* () {
        const out = new Array(arr.length);
        yield Promise.all(arr.map((em, idx) => __awaiter(this, void 0, void 0, function* () {
            out[idx] = yield mapper(em);
        })));
        return out;
    });
}
exports.mapAsyncOrdered = mapAsyncOrdered;
function readdirRecursive(dirPath, keepIf) {
    function relativePath(file) {
        const prefix = dirPath + path.sep;
        assert(file.startsWith(prefix));
        return file.slice(prefix.length);
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
function indent(str) {
    return "\t" + str.replace(/\n/g, "\n\t");
}
exports.indent = indent;
function stripQuotes(s) {
    if (s[0] === '"' || s[0] === "'") {
        return s.substr(1, s.length - 2);
    }
    else {
        throw new Error(`${s} is not quoted`);
    }
}
exports.stripQuotes = stripQuotes;
function unique(arr) {
    return [...new Set(arr)];
}
exports.unique = unique;
function readFile(path) {
    return fsp.readFile(path, { encoding: "utf8" });
}
exports.readFile = readFile;
function readJson(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return parseJson(yield readFile(path));
    });
}
exports.readJson = readJson;
function fetchJson(url, init) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(url, init);
        const text = yield response.text();
        return parseJson(text);
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
function done(promise) {
    promise.catch(console.error);
}
exports.done = done;
function gzip(input) {
    return input.pipe(zlib.createGzip());
}
exports.gzip = gzip;
function unGzip(input) {
    const output = zlib.createGunzip();
    input.pipe(output);
    return output;
}
exports.unGzip = unGzip;
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
//# sourceMappingURL=util.js.map