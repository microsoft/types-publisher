"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs_extra_1 = require("fs-extra");
const http_1 = require("http");
const https_1 = require("https");
const path_1 = require("path");
const stream_1 = require("stream");
const string_decoder_1 = require("string_decoder");
const util_1 = require("./util");
async function readFile(path) {
    const res = await fs_extra_1.readFile(path, { encoding: "utf8" });
    if (res.includes("�")) {
        throw new Error(`Bad character in ${path}`);
    }
    return res;
}
exports.readFile = readFile;
async function readJson(path) {
    return util_1.parseJson(await readFile(path));
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
    const s = new stream_1.Readable();
    s.push(text);
    s.push(null); // tslint:disable-line no-null-keyword
    return s;
}
exports.streamOfString = streamOfString;
function stringOfStream(stream, description) {
    const decoder = new string_decoder_1.StringDecoder("utf8");
    let body = "";
    stream.on("data", (data) => {
        body += decoder.write(data);
    });
    return new Promise((resolve, reject) => {
        stream.on("error", reject);
        stream.on("end", () => {
            body += decoder.end();
            if (body.includes("�")) {
                reject(`Bad character decode in ${description}`);
            }
            else {
                resolve(body);
            }
        });
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
    async fetchJson(options) {
        const text = await this.fetch(options);
        try {
            return JSON.parse(text);
        }
        catch (e) {
            throw new Error(`Bad response from server:\noptions: ${options}\n\n${text}`);
        }
    }
    async fetch(options) {
        const maxRetries = options.retries === false || options.retries === undefined ? 0 : options.retries === true ? 10 : options.retries;
        for (let retries = maxRetries; retries > 1; retries--) {
            try {
                return await this.fetchOnce(options);
            }
            catch (err) {
                if (!/EAI_AGAIN|ETIMEDOUT|ECONNRESET/.test(err.message)) {
                    throw err;
                }
            }
            await sleep(1);
        }
        return this.fetchOnce(options);
    }
    fetchOnce(options) {
        return doRequest(options, https_1.request, this.agent);
    }
}
exports.Fetcher = Fetcher;
/** Only used for testing. */
function makeHttpRequest(options) {
    return doRequest(options, http_1.request);
}
exports.makeHttpRequest = makeHttpRequest;
function doRequest(options, makeRequest, agent) {
    return new Promise((resolve, reject) => {
        const req = makeRequest({
            hostname: options.hostname,
            port: options.port,
            path: `/${options.path}`,
            agent,
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
async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
exports.sleep = sleep;
async function isDirectory(path) {
    return (await fs_extra_1.stat(path)).isDirectory();
}
exports.isDirectory = isDirectory;
async function assertDirectoriesEqual(expected, actual, options) {
    const expectedLs = await fs_extra_1.readdir(expected);
    const actualLs = await fs_extra_1.readdir(actual);
    assert.deepStrictEqual(expectedLs, actualLs);
    for (const name of expectedLs) {
        if (options.ignore(name)) {
            continue;
        }
        const expectedFile = path_1.join(expected, name);
        const actualFile = path_1.join(actual, name);
        const expectedStat = await fs_extra_1.stat(expectedFile);
        const actualStat = await fs_extra_1.stat(actualFile);
        assert.strictEqual(expectedStat.isDirectory(), actualStat.isDirectory());
        if (expectedStat.isDirectory()) {
            await assertDirectoriesEqual(expectedFile, actualFile, options);
        }
        else {
            assert.strictEqual(await readFile(actualFile), await readFile(expectedFile));
        }
    }
}
exports.assertDirectoriesEqual = assertDirectoriesEqual;
exports.npmInstallFlags = "--ignore-scripts --no-shrinkwrap --no-package-lock --no-bin-links --no-save";
//# sourceMappingURL=io.js.map