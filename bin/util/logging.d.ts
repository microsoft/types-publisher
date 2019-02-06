/** Anything capable of receiving messages is a logger. */
export declare type Logger = (message: string) => void;
/** Recording of every message sent to a Logger. */
export declare type Log = string[];
/** Stores two separate loggers. */
export interface LoggerWithErrors {
    info: Logger;
    error: Logger;
}
/** Recording of every message sent to a LoggerWithErrors. */
export interface LogWithErrors {
    infos: Log;
    errors: Log;
}
/** Logger that *just* outputs to the console and does not save anything. */
export declare const consoleLogger: LoggerWithErrors;
/** Logger that *just* records writes and does not output to console. */
export declare function quietLogger(): [Logger, () => Log];
/** Logger that writes to console in addition to recording a result. */
export declare function logger(): [Logger, () => Log];
/** Records `info` and `error` messages without writing to console. */
export declare function quietLoggerWithErrors(): [LoggerWithErrors, () => LogWithErrors];
/** Records `info` and `error` messages, calling appropriate console methods as well. */
export declare function loggerWithErrors(): [LoggerWithErrors, () => LogWithErrors];
/**
 * Move everything from one Log to another logger.
 * This is useful for performing several tasks in parallel, but outputting their logs in sequence.
 */
export declare function moveLogs(dest: Logger, src: Log, mapper?: (message: string) => string): void;
/** Perform `moveLogs` for both parts of a LogWithErrors. */
export declare function moveLogsWithErrors(dest: LoggerWithErrors, { infos, errors }: LogWithErrors, mapper?: (message: string) => string): void;
export declare function logPath(logName: string): string;
export declare function writeLog(logName: string, contents: ReadonlyArray<string>): Promise<void>;
export declare function joinLogWithErrors({ infos, errors }: LogWithErrors): Log;
