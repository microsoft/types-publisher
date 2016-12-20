"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const child_process = require("child_process");
const moment = require("moment");
const os = require("os");
const object_entries_1 = require("object.entries");
object_entries_1.shim();
const object_values_1 = require("object.values");
object_values_1.shim();
const util_1 = require("util");
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
exports.numberOfOsProcesses = os.cpus().length;
function nAtATime(n, inputs, use) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = new Array(inputs.length);
        // We have n "threads" which each run `continuouslyWork`.
        // They all share `nextIndex`, so each work item is done only once.
        let nextIndex = 0;
        yield Promise.all(initArray(n, () => __awaiter(this, void 0, void 0, function* () {
            while (nextIndex !== inputs.length) {
                const index = nextIndex;
                nextIndex++;
                results[index] = yield use(inputs[index]);
            }
        })));
        return results;
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
function done(promise) {
    promise.catch(error => {
        console.error(error);
        process.exit(1);
    });
}
exports.done = done;
function initArray(length, makeElement) {
    const arr = new Array(length);
    for (let i = 0; i < length; i++) {
        arr[i] = makeElement();
    }
    return arr;
}
function normalizeSlashes(path) {
    return path.replace(/\\/g, "/");
}
exports.normalizeSlashes = normalizeSlashes;
function hasOwnProperty(object, propertyName) {
    return Object.prototype.hasOwnProperty.call(object, propertyName);
}
exports.hasOwnProperty = hasOwnProperty;
function intOfString(str) {
    const n = Number.parseInt(str, 10);
    if (Number.isNaN(n)) {
        throw new Error(`Error in parseInt(${JSON.stringify(str)})`);
    }
    return n;
}
exports.intOfString = intOfString;
function sortObjectKeys(data) {
    const out = {};
    for (const key of Object.keys(data).sort()) {
        out[key] = data[key];
    }
    return out;
}
exports.sortObjectKeys = sortObjectKeys;
/** Run a command and return the error, stdout, and stderr. (Never throws.) */
function exec(cmd, cwd) {
    return new Promise((resolve) => {
        child_process.exec(cmd, { encoding: "utf8", cwd }, (error, stdout, stderr) => {
            stdout = stdout.trim();
            stderr = stderr.trim();
            resolve({ error, stdout, stderr });
        });
    });
}
exports.exec = exec;
/** Run a command and return the stdout, or if there was an error, throw. */
function execAndThrowErrors(cmd, cwd) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error, stdout, stderr } = yield exec(cmd, cwd);
        if (error) {
            throw new Error(stderr);
        }
        return stdout + stderr;
    });
}
exports.execAndThrowErrors = execAndThrowErrors;
function errorDetails(error) {
    return error.stack || error.message || `Non-Error error: ${util_1.inspect(error)}`;
}
exports.errorDetails = errorDetails;
/**
 * Returns the input that is better than all others, or `undefined` if there are no inputs.
 * @param isBetter Returns true if `a` should be preferred over `b`.
 */
function best(inputs, isBetter) {
    if (!inputs.length) {
        return undefined;
    }
    let best = inputs[0];
    for (let i = 1; i < inputs.length; i++) {
        const candidate = inputs[i];
        if (isBetter(candidate, best)) {
            best = candidate;
        }
    }
    return best;
}
exports.best = best;
//# sourceMappingURL=util.js.map