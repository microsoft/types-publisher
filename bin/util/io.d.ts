/// <reference types="node" />
export declare function readFile(path: string): Promise<string>;
export declare function readJson(path: string): Promise<object>;
export declare function writeFile(path: string, content: string): Promise<void>;
export declare function writeJson(path: string, content: unknown, formatted?: boolean): Promise<void>;
export declare function streamOfString(text: string): NodeJS.ReadableStream;
export declare function stringOfStream(stream: NodeJS.ReadableStream, description: string): Promise<string>;
export declare function streamDone(stream: NodeJS.WritableStream): Promise<void>;
export interface FetchOptions {
    readonly hostname: string;
    readonly port?: number;
    readonly path: string;
    readonly retries?: boolean | number;
    readonly body?: string;
    readonly method?: "GET" | "PATCH" | "POST";
    readonly headers?: {};
}
export declare class Fetcher {
    private readonly agent;
    fetchJson(options: FetchOptions): Promise<unknown>;
    fetch(options: FetchOptions): Promise<string>;
}
/** Only used for testing. */
export declare function makeHttpRequest(options: FetchOptions): Promise<string>;
export declare function sleep(seconds: number): Promise<void>;
export declare function isDirectory(path: string): Promise<boolean>;
export declare const npmInstallFlags = "--ignore-scripts --no-shrinkwrap --no-package-lock --no-bin-links --no-save";
