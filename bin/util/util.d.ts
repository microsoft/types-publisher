export declare function assertDefined<T>(x: T | undefined, message?: string | Error | undefined): T;
import { Options } from "../lib/common";
export declare function parseJson(text: string): object;
export declare function currentTimeStamp(): string;
export declare const numberOfOsProcesses: number;
/** Progress options needed for `nAtATime`. Other options will be inferred. */
interface ProgressOptions<T, U> {
    readonly name: string;
    flavor(input: T, output: U): string | undefined;
    readonly options: Options;
}
export declare function nAtATime<T, U>(n: number, inputs: ReadonlyArray<T>, use: (t: T) => Awaitable<U>, progressOptions?: ProgressOptions<T, U>): Promise<U[]>;
export declare function filter<T>(iterable: Iterable<T>, predicate: (value: T) => boolean): IterableIterator<T>;
export declare type Awaitable<T> = T | Promise<T>;
export declare function filterNAtATimeOrdered<T>(n: number, inputs: ReadonlyArray<T>, shouldKeep: (input: T) => Awaitable<boolean>, progress?: ProgressOptions<T, boolean>): Promise<T[]>;
export declare function unique<T>(arr: Iterable<T>): T[];
export declare function logUncaughtErrors(promise: Promise<unknown> | (() => Promise<unknown>)): void;
/** Always use "/" for consistency. (This affects package content hash.) */
export declare function joinPaths(...paths: string[]): string;
/** Convert a path to use "/" instead of "\\" for consistency. (This affects content hash.) */
export declare function normalizeSlashes(path: string): string;
export declare function hasWindowsSlashes(path: string): boolean;
export declare function intOfString(str: string): number;
export declare function sortObjectKeys<T extends {
    [key: string]: unknown;
}>(data: T): T;
/** Run a command and return the error, stdout, and stderr. (Never throws.) */
export declare function exec(cmd: string, cwd?: string): Promise<{
    error: Error | undefined;
    stdout: string;
    stderr: string;
}>;
/** Run a command and return the stdout, or if there was an error, throw. */
export declare function execAndThrowErrors(cmd: string, cwd?: string): Promise<string>;
/**
 * Returns the input that is better than all others, or `undefined` if there are no inputs.
 * @param isBetter Returns true if `a` should be preferred over `b`.
 */
export declare function best<T>(inputs: Iterable<T>, isBetter: (a: T, b: T) => boolean): T | undefined;
export declare function computeHash(content: string): string;
export declare function mapValues<K, V1, V2>(map: Map<K, V1>, valueMapper: (value: V1) => V2): Map<K, V2>;
export declare function mapDefined<T, U>(arr: Iterable<T>, mapper: (t: T) => U | undefined): U[];
export declare function mapDefinedAsync<T, U>(arr: Iterable<T>, mapper: (t: T) => Promise<U | undefined>): Promise<U[]>;
export declare function mapIter<T, U>(inputs: Iterable<T>, mapper: (t: T) => U): Iterable<U>;
export declare function flatMap<T, U>(inputs: Iterable<T>, mapper: (t: T) => Iterable<U>): Iterable<U>;
export declare function sort<T>(values: Iterable<T>, comparer?: (a: T, b: T) => number): T[];
export declare function join<T>(values: Iterable<T>, joiner?: string): string;
export interface RunWithChildProcessesOptions<In> {
    readonly inputs: ReadonlyArray<In>;
    readonly commandLineArgs: string[];
    readonly workerFile: string;
    readonly nProcesses: number;
    handleOutput(output: unknown): void;
}
export declare function runWithChildProcesses<In>({ inputs, commandLineArgs, workerFile, nProcesses, handleOutput }: RunWithChildProcessesOptions<In>): Promise<void>;
export declare const enum CrashRecoveryState {
    Normal = 0,
    Retry = 1,
    RetryWithMoreMemory = 2,
    Crashed = 3
}
interface RunWithListeningChildProcessesOptions<In> {
    readonly inputs: ReadonlyArray<In>;
    readonly commandLineArgs: string[];
    readonly workerFile: string;
    readonly nProcesses: number;
    readonly cwd: string;
    readonly crashRecovery?: boolean;
    readonly crashRecoveryMaxOldSpaceSize?: number;
    readonly softTimeoutMs?: number;
    handleOutput(output: unknown, processIndex: number | undefined): void;
    handleStart?(input: In, processIndex: number | undefined): void;
    handleCrash?(input: In, state: CrashRecoveryState, processIndex: number | undefined): void;
}
export declare function runWithListeningChildProcesses<In>({ inputs, commandLineArgs, workerFile, nProcesses, cwd, handleOutput, crashRecovery, crashRecoveryMaxOldSpaceSize, handleStart, handleCrash, softTimeoutMs }: RunWithListeningChildProcessesOptions<In>): Promise<void>;
export declare function assertNever(_: never): never;
export declare function recordToMap<T>(record: Record<string, T>): Map<string, T>;
export declare function recordToMap<T, U>(record: Record<string, T>, cb: (t: T) => U): Map<string, U>;
export declare function mapToRecord<T>(map: Map<string, T>): Record<string, T>;
export declare function mapToRecord<T, U>(map: Map<string, T>, cb: (t: T) => U): Record<string, U>;
export declare function identity<T>(t: T): T;
export declare function withoutStart(s: string, start: string): string | undefined;
export declare function unmangleScopedPackage(packageName: string): string | undefined;
/** Returns [values that cb returned undefined for, defined results of cb]. */
export declare function split<T, U>(inputs: ReadonlyArray<T>, cb: (t: T) => U | undefined): [ReadonlyArray<T>, ReadonlyArray<U>];
export declare function assertSorted(a: ReadonlyArray<string>): ReadonlyArray<string>;
export declare function assertSorted<T>(a: ReadonlyArray<T>, cb: (t: T) => string): ReadonlyArray<T>;
export {};
