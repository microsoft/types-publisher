import { Options } from "./lib/common";
import { LoggerWithErrors } from "./util/logging";
import { Awaitable } from "./util/util";
/**
 * Readonly filesystem.
 * Paths provided to these methods should be relative to the FS object's root but not start with '/' or './'.
 */
export interface FS {
    /**
     * Alphabetically sorted list of files and subdirectories.
     * If dirPath is missing, reads the root.
     */
    readdir(dirPath?: string): Awaitable<ReadonlyArray<string>>;
    readJson(path: string): Awaitable<unknown>;
    readFile(path: string): Awaitable<string>;
    isDirectory(dirPath: string): Awaitable<boolean>;
    exists(path: string): Awaitable<boolean>;
    /** FileSystem rooted at a child directory. */
    subDir(path: string): FS;
    /** Representation of current location, for debugging. */
    debugPath(): string;
}
export declare function getDefinitelyTyped(options: Options, log: LoggerWithErrors): Promise<FS>;
export declare function getLocallyInstalledDefinitelyTyped(path: string): FS;
interface ReadonlyDir extends ReadonlyMap<string, ReadonlyDir | string> {
    readonly parent: Dir | undefined;
}
export declare class Dir extends Map<string, Dir | string> implements ReadonlyDir {
    readonly parent: Dir | undefined;
    constructor(parent: Dir | undefined);
    subdir(name: string): Dir;
    finish(): Dir;
}
export declare class InMemoryDT implements FS {
    readonly curDir: ReadonlyDir;
    readonly pathToRoot: string;
    /** pathToRoot is just for debugging */
    constructor(curDir: ReadonlyDir, pathToRoot: string);
    private tryGetEntry;
    private getEntry;
    private getDir;
    readFile(filePath: string): string;
    readdir(dirPath?: string): ReadonlyArray<string>;
    readJson(path: string): unknown;
    isDirectory(path: string): boolean;
    exists(path: string): boolean;
    subDir(path: string): FS;
    debugPath(): string;
}
export {};
