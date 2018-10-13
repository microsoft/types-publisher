"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const common_1 = require("../lib/common");
const util_1 = require("../util/util");
const io_1 = require("./io");
/** Logger that *just* outputs to the console and does not save anything. */
exports.consoleLogger = {
    info: console.log,
    error: console.error,
};
/** Logger that *just* records writes and does not output to console. */
function quietLogger() {
    const logged = [];
    return [(message) => logged.push(message), () => logged];
}
exports.quietLogger = quietLogger;
/** Performs a side-effect and also records all logs. */
function alsoConsoleLogger(consoleLog) {
    const [log, logResult] = quietLogger();
    return [
        (message) => {
            consoleLog(message);
            log(message);
        },
        logResult
    ];
}
/** Logger that writes to console in addition to recording a result. */
function logger() {
    return alsoConsoleLogger(exports.consoleLogger.info);
}
exports.logger = logger;
/** Helper for creating `info` and `error` loggers together. */
function loggerWithErrorsHelper(logger) {
    const [info, infoResult] = logger();
    const [error, errorResult] = logger();
    return [
        { info, error },
        () => ({ infos: infoResult(), errors: errorResult() })
    ];
}
/** Records `info` and `error` messages without writing to console. */
function quietLoggerWithErrors() {
    return loggerWithErrorsHelper(quietLogger);
}
exports.quietLoggerWithErrors = quietLoggerWithErrors;
/** Records `info` and `error` messages, calling appropriate console methods as well. */
function loggerWithErrors() {
    return loggerWithErrorsHelper(logger);
}
exports.loggerWithErrors = loggerWithErrors;
/**
 * Move everything from one Log to another logger.
 * This is useful for performing several tasks in parallel, but outputting their logs in sequence.
 */
function moveLogs(dest, src, mapper) {
    for (const line of src) {
        dest(mapper ? mapper(line) : line);
    }
}
exports.moveLogs = moveLogs;
/** Perform `moveLogs` for both parts of a LogWithErrors. */
function moveLogsWithErrors(dest, { infos, errors }, mapper) {
    moveLogs(dest.info, infos, mapper);
    moveLogs(dest.error, errors, mapper);
}
exports.moveLogsWithErrors = moveLogsWithErrors;
const logDir = util_1.joinPaths(common_1.home, "logs");
function logPath(logName) {
    return util_1.joinPaths(logDir, logName);
}
exports.logPath = logPath;
async function writeLog(logName, contents) {
    await fs_extra_1.ensureDir(logDir);
    await io_1.writeFile(logPath(logName), contents.join("\r\n"));
}
exports.writeLog = writeLog;
function joinLogWithErrors({ infos, errors }) {
    return errors.length ? infos.concat(["", "=== ERRORS ===", ""], errors) : infos;
}
exports.joinLogWithErrors = joinLogWithErrors;
//# sourceMappingURL=logging.js.map