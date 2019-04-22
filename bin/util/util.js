"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const child_process_1 = require("child_process");
const crypto = require("crypto");
const moment = require("moment");
const os = require("os");
const sourceMapSupport = require("source-map-support");
const yargs = require("yargs");
sourceMapSupport.install();
function assertDefined(x, message) {
    assert(x !== undefined, message);
    return x;
}
exports.assertDefined = assertDefined;
const progress_1 = require("./progress");
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
exports.numberOfOsProcesses = process.env.TRAVIS === "true" ? 2 : os.cpus().length;
async function nAtATime(n, inputs, use, progressOptions) {
    const progress = progressOptions && progressOptions.options.progress ? new progress_1.default({ name: progressOptions.name }) : undefined;
    const results = new Array(inputs.length);
    // We have n "threads" which each run `continuouslyWork`.
    // They all share `nextIndex`, so each work item is done only once.
    let nextIndex = 0;
    await Promise.all(initArray(n, async () => {
        while (nextIndex !== inputs.length) {
            const index = nextIndex;
            nextIndex++;
            const input = inputs[index];
            const output = await use(input);
            results[index] = output;
            if (progress) {
                progress.update(index / inputs.length, progressOptions.flavor(input, output));
            }
        }
    }));
    if (progress) {
        progress.done();
    }
    return results;
}
exports.nAtATime = nAtATime;
function filter(iterable, predicate) {
    const iter = iterable[Symbol.iterator]();
    return {
        [Symbol.iterator]() { return this; },
        next() {
            while (true) {
                const res = iter.next();
                if (res.done || predicate(res.value)) {
                    return res;
                }
            }
        },
    };
}
exports.filter = filter;
async function filterNAtATimeOrdered(n, inputs, shouldKeep, progress) {
    const shouldKeeps = await nAtATime(n, inputs, shouldKeep, progress);
    return inputs.filter((_, idx) => shouldKeeps[idx]);
}
exports.filterNAtATimeOrdered = filterNAtATimeOrdered;
async function mapAsyncOrdered(arr, mapper) {
    const out = new Array(arr.length);
    await Promise.all(arr.map(async (em, idx) => {
        out[idx] = await mapper(em);
    }));
    return out;
}
exports.mapAsyncOrdered = mapAsyncOrdered;
function unique(arr) {
    return [...new Set(arr)];
}
exports.unique = unique;
function logUncaughtErrors(promise) {
    (typeof promise === "function" ? promise() : promise).catch(error => {
        console.error(error);
        process.exit(1);
    });
}
exports.logUncaughtErrors = logUncaughtErrors;
function initArray(length, makeElement) {
    const arr = new Array(length);
    for (let i = 0; i < length; i++) {
        arr[i] = makeElement(i);
    }
    return arr;
}
/** Always use "/" for consistency. (This affects package content hash.) */
function joinPaths(...paths) {
    return paths.join("/");
}
exports.joinPaths = joinPaths;
/** Convert a path to use "/" instead of "\\" for consistency. (This affects content hash.) */
function normalizeSlashes(path) {
    return path.replace(/\\/g, "/");
}
exports.normalizeSlashes = normalizeSlashes;
function hasWindowsSlashes(path) {
    return path.includes("\\");
}
exports.hasWindowsSlashes = hasWindowsSlashes;
function intOfString(str) {
    const n = Number.parseInt(str, 10);
    if (Number.isNaN(n)) {
        throw new Error(`Error in parseInt(${JSON.stringify(str)})`);
    }
    return n;
}
exports.intOfString = intOfString;
function sortObjectKeys(data) {
    const out = {}; // tslint:disable-line no-object-literal-type-assertion
    for (const key of Object.keys(data).sort()) {
        out[key] = data[key];
    }
    return out;
}
exports.sortObjectKeys = sortObjectKeys;
/** Run a command and return the error, stdout, and stderr. (Never throws.) */
function exec(cmd, cwd) {
    return new Promise(resolve => {
        // Fix "stdout maxBuffer exceeded" error
        // See https://github.com/DefinitelyTyped/DefinitelyTyped/pull/26545#issuecomment-402274021
        const maxBuffer = 1024 * 1024 * 1; // Max = 1 MiB, default is 200 KiB
        child_process_1.exec(cmd, { encoding: "utf8", cwd, maxBuffer }, (error, stdout, stderr) => {
            resolve({ error: error === null ? undefined : error, stdout: stdout.trim(), stderr: stderr.trim() });
        });
    });
}
exports.exec = exec;
/** Run a command and return the stdout, or if there was an error, throw. */
async function execAndThrowErrors(cmd, cwd) {
    const { error, stdout, stderr } = await exec(cmd, cwd);
    if (error) {
        throw new Error(`${error.stack}\n${stderr}`);
    }
    return stdout + stderr;
}
exports.execAndThrowErrors = execAndThrowErrors;
/**
 * Returns the input that is better than all others, or `undefined` if there are no inputs.
 * @param isBetter Returns true if `a` should be preferred over `b`.
 */
function best(inputs, isBetter) {
    const iter = inputs[Symbol.iterator]();
    const first = iter.next();
    if (first.done) {
        return undefined;
    }
    let res = first.value;
    while (true) {
        const { value, done } = iter.next();
        if (done) {
            break;
        }
        if (isBetter(value, res)) {
            res = value;
        }
    }
    return res;
}
exports.best = best;
function computeHash(content) {
    // Normalize line endings
    const normalContent = content.replace(/\r\n?/g, "\n");
    const h = crypto.createHash("sha256");
    h.update(normalContent, "utf8");
    return h.digest("hex");
}
exports.computeHash = computeHash;
function mapValues(map, valueMapper) {
    const out = new Map();
    map.forEach((value, key) => {
        out.set(key, valueMapper(value));
    });
    return out;
}
exports.mapValues = mapValues;
function mapDefined(arr, mapper) {
    const out = [];
    for (const a of arr) {
        const res = mapper(a);
        if (res !== undefined) {
            out.push(res);
        }
    }
    return out;
}
exports.mapDefined = mapDefined;
async function mapDefinedAsync(arr, mapper) {
    const out = [];
    for (const a of arr) {
        const res = await mapper(a);
        if (res !== undefined) {
            out.push(res);
        }
    }
    return out;
}
exports.mapDefinedAsync = mapDefinedAsync;
function* mapIter(inputs, mapper) {
    for (const input of inputs) {
        yield mapper(input);
    }
}
exports.mapIter = mapIter;
function* flatMap(inputs, mapper) {
    for (const input of inputs) {
        yield* mapper(input);
    }
}
exports.flatMap = flatMap;
function sort(values, comparer) {
    return Array.from(values).sort(comparer);
}
exports.sort = sort;
function join(values, joiner = ", ") {
    let s = "";
    for (const v of values) {
        s += `${v}${joiner}`;
    }
    return s.slice(0, s.length - joiner.length);
}
exports.join = join;
function runWithChildProcesses({ inputs, commandLineArgs, workerFile, nProcesses, handleOutput }) {
    return new Promise((resolve, reject) => {
        const nPerProcess = Math.floor(inputs.length / nProcesses);
        let processesLeft = nProcesses;
        let rejected = false;
        const allChildren = [];
        for (let i = 0; i < nProcesses; i++) {
            const lo = nPerProcess * i;
            const hi = i === nProcesses - 1 ? inputs.length : lo + nPerProcess;
            let outputsLeft = hi - lo; // Expect one output per input
            if (outputsLeft === 0) {
                // No work for this process to do, so don't launch it
                processesLeft--;
                continue;
            }
            const child = child_process_1.fork(workerFile, commandLineArgs);
            allChildren.push(child);
            child.send(inputs.slice(lo, hi));
            child.on("message", outputMessage => {
                handleOutput(outputMessage);
                assert(outputsLeft > 0);
                outputsLeft--;
                if (outputsLeft === 0) {
                    assert(processesLeft > 0);
                    processesLeft--;
                    if (processesLeft === 0) {
                        resolve();
                    }
                    child.kill();
                }
            });
            child.on("disconnect", () => {
                if (outputsLeft !== 0) {
                    fail();
                }
            });
            child.on("close", () => { assert(rejected || outputsLeft === 0); });
            child.on("error", fail);
        }
        function fail() {
            rejected = true;
            for (const child of allChildren) {
                child.kill();
            }
            reject(new Error("Parsing failed."));
        }
    });
}
exports.runWithChildProcesses = runWithChildProcesses;
function runWithListeningChildProcesses({ inputs, commandLineArgs, workerFile, nProcesses, cwd, handleOutput, crashRecovery, crashRecoveryMaxOldSpaceSize = 4096, handleCrash }) {
    return new Promise((resolve, reject) => {
        let inputIndex = 0;
        let processesLeft = nProcesses;
        let rejected = false;
        const allChildren = new Set();
        const argv = yargs(process.execArgv).argv;
        const maxOldSpaceSize = argv.max_old_space_size || argv.maxOldSpaceSize || 0;
        for (let i = 0; i < nProcesses; i++) {
            if (inputIndex === inputs.length) {
                processesLeft--;
                continue;
            }
            let child;
            let crashRecoveryState = 0 /* Normal */;
            let currentInput = inputs[inputIndex];
            inputIndex++;
            const onMessage = (outputMessage) => {
                const oldCrashRecoveryState = crashRecoveryState;
                crashRecoveryState = 0 /* Normal */;
                handleOutput(outputMessage);
                if (inputIndex === inputs.length) {
                    processesLeft--;
                    if (processesLeft === 0) {
                        resolve();
                    }
                    child.kill();
                }
                else {
                    currentInput = inputs[inputIndex];
                    inputIndex++;
                    if (oldCrashRecoveryState === 2 /* RetryWithMoreMemory */) {
                        // succeeded when running with more memory. Restart the child with less memory
                        restartChild();
                    }
                    else {
                        child.send(currentInput);
                    }
                }
            };
            const onClose = (code, signal) => {
                if (rejected || inputIndex === inputs.length) {
                    return;
                }
                // `134` seems to be the exit code used by Node when it runs out of memory.
                if (crashRecovery && code === 134 && signal === null) {
                    switch (crashRecoveryState) {
                        case 0 /* Normal */:
                            crashRecoveryState = 1 /* Retry */;
                            if (handleCrash) {
                                handleCrash(currentInput, crashRecoveryState);
                            }
                            restartChild();
                            return;
                        case 1 /* Retry */:
                            // skip crash recovery if we're already passing a value for --max_old_space_size that is >= crashRecoveryMaxOldSpaceSize
                            if (maxOldSpaceSize < crashRecoveryMaxOldSpaceSize) {
                                crashRecoveryState = 2 /* RetryWithMoreMemory */;
                                if (handleCrash) {
                                    handleCrash(currentInput, crashRecoveryState);
                                }
                                restartChild([...getExecArgvWithoutMaxOldSpaceSize(), `--max_old_space_size=${crashRecoveryMaxOldSpaceSize}`]);
                                return;
                            }
                            break;
                        default:
                    }
                }
                fail();
            };
            const onError = () => {
                fail();
            };
            const startChild = (execArgv) => {
                child = child_process_1.fork(workerFile, commandLineArgs, { cwd, execArgv });
                allChildren.add(child);
                child.on("message", onMessage);
                child.on("close", onClose);
                child.on("error", onError);
                child.send(currentInput);
            };
            const restartChild = (execArgv) => {
                child.kill();
                allChildren.delete(child);
                startChild(execArgv);
            };
            startChild(process.execArgv);
        }
        function fail() {
            if (!rejected) {
                rejected = true;
                for (const child of allChildren) {
                    child.kill();
                }
                reject(new Error(`Something went wrong in ${runWithListeningChildProcesses.name}`));
            }
        }
    });
}
exports.runWithListeningChildProcesses = runWithListeningChildProcesses;
let execArgvWithoutMaxOldSpaceSize;
function getExecArgvWithoutMaxOldSpaceSize() {
    if (!execArgvWithoutMaxOldSpaceSize) {
        // remove --max_old_space_size from execArgv
        const execArgv = process.execArgv.slice();
        const maxOldSpaceSizeRegExp = /^--max[-_]old[-_]space[-_]size($|=)/;
        let maxOldSpaceSizeIndex = execArgv.findIndex(arg => maxOldSpaceSizeRegExp.test(arg));
        while (maxOldSpaceSizeIndex !== -1) {
            if (execArgv[maxOldSpaceSizeIndex].length === "--max_old_space_size".length) {
                execArgv.splice(maxOldSpaceSizeIndex, 2);
            }
            else {
                execArgv.splice(maxOldSpaceSizeIndex, 1);
            }
            maxOldSpaceSizeIndex = execArgv.findIndex(arg => maxOldSpaceSizeRegExp.test(arg));
        }
        execArgvWithoutMaxOldSpaceSize = execArgv;
    }
    return execArgvWithoutMaxOldSpaceSize;
}
function assertNever(_) {
    throw new Error();
}
exports.assertNever = assertNever;
function recordToMap(record, cb) {
    const m = new Map();
    for (const key in record) {
        m.set(key, cb ? cb(record[key]) : record[key]);
    }
    return m;
}
exports.recordToMap = recordToMap;
function mapToRecord(map, cb) {
    const o = {};
    map.forEach((value, key) => { o[key] = cb ? cb(value) : value; });
    return o;
}
exports.mapToRecord = mapToRecord;
function identity(t) { return t; }
exports.identity = identity;
function withoutStart(s, start) {
    return s.startsWith(start) ? s.slice(start.length) : undefined;
}
exports.withoutStart = withoutStart;
// Based on `getPackageNameFromAtTypesDirectory` in TypeScript.
function unmangleScopedPackage(packageName) {
    const separator = "__";
    return packageName.includes(separator) ? `@${packageName.replace(separator, "/")}` : undefined;
}
exports.unmangleScopedPackage = unmangleScopedPackage;
/** Returns [values that cb returned undefined for, defined results of cb]. */
function split(inputs, cb) {
    const keep = [];
    const splitOut = [];
    for (const input of inputs) {
        const res = cb(input);
        if (res === undefined) {
            keep.push(input);
        }
        else {
            splitOut.push(res);
        }
    }
    return [keep, splitOut];
}
exports.split = split;
function assertSorted(a, cb = (t) => t) {
    let prev = a[0];
    for (let i = 1; i < a.length; i++) {
        const x = a[i];
        assert(cb(x) >= cb(prev), `${JSON.stringify(x)} >= ${JSON.stringify(prev)}`);
        prev = x;
    }
    return a;
}
exports.assertSorted = assertSorted;
//# sourceMappingURL=util.js.map