import { createWriteStream } from "fs";
import { extract, pack } from "tar-fs";
import { dirSync as tmpDir } from "tmp";
import { createGunzip, createGzip } from "zlib";
import { readFile, streamDone } from "./io";
import { joinPaths } from "./util";

export function gzip(input: NodeJS.ReadableStream): NodeJS.ReadableStream {
	return input.pipe(createGzip());
}

export function unGzip(input: NodeJS.ReadableStream): NodeJS.ReadableStream {
	const output = createGunzip();
	input.pipe(output);
	return output;
}

export async function unGzipFileFromTar(input: NodeJS.ReadableStream, file: string): Promise<string> {
	const cwd = tmpDir().name;
	await streamDone(unGzip(input).pipe(extract(cwd)));
	return readFile(joinPaths(cwd, file));
}

export function writeTgz(inputDirectory: string, outFileName: string): Promise<void> {
	return streamDone(createTgz(inputDirectory).pipe(createWriteStream(outFileName)));
}

// To output this for testing: Export it and:
// `require("./bin/lib/npm-client").createTgz("./output/foo", err => { throw err }).pipe(fs.createWriteStream("foo.tgz"))`
export function createTgz(dir: string): NodeJS.ReadableStream {
	return gzip(pack(dir));
}
