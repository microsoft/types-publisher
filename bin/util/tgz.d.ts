/// <reference types="node" />
export declare function gzip(input: NodeJS.ReadableStream): NodeJS.ReadableStream;
export declare function unGzip(input: NodeJS.ReadableStream): NodeJS.ReadableStream;
export declare function writeTgz(inputDirectory: string, outFileName: string): Promise<void>;
export declare function createTgz(dir: string, onError: (error: Error) => void): NodeJS.ReadableStream;
