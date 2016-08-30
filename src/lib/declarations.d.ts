interface Array<T> {
	includes(value: T): boolean;
}

declare module "fstream" {
	export function Reader(options: { path: string, type: "Directory" }): NodeJS.ReadableStream;
}

declare module "npm-registry-client" {
	// Definitions transcribed from https://github.com/npm/npm-registry-client
	class RegClient {
		constructor(config: {});
		request(uri: string, params: RegClient.RequestParams, cb: (error: Error, data: any, json: any, response: any) => void): void;
		publish(uri: string, params: RegClient.PublishParams, cb: (error: Error) => void): void;
		tag(uri: string, params: RegClient.TagParams, cb: (error: Error) => void): void;
		deprecate(uri: string, params: RegClient.DeprecateParams, cb: (error: Error, data: any, raw: string, response: any) => void): void;
	}
	namespace RegClient {
		interface RequestParams {
			method?: string;
			body?: {};
		}
		interface PublishParams {
			metadata: {};
			access: "public" | "restricted";
			body: NodeJS.ReadableStream;
			auth: Credentials;
		}
		interface TagParams {
			version: string;
			tag: string;
			auth: Credentials;
		}
		interface DeprecateParams {
			version: string;
			message: string;
			auth: Credentials;
		}
		interface Credentials {
			token: string;
		}
	}
	export = RegClient;
}

declare module "buffer-equals-constant" {
	function f(a: Buffer, b: Buffer): boolean;
	export = f;
}

declare module "fs-promise" {
	export function emptyDir(dirPath: string): Promise<void>
	export function ensureDir(dirPath: string): Promise<void>;
	export function exists(path: string): Promise<boolean>;
	export function writeFile(path: string, content: string, options: { encoding: "utf8" }): Promise<void>;
	export function readFile(path: string, options: { encoding: "utf8" }): Promise<string>;
	export function mkdirp(path: string): Promise<void>;
	export function readdir(dirPath: string): Promise<string[]>;
	export function remove(path: string): Promise<void>;
	export function stat(path: string): Promise<{ isDirectory(): boolean }>;
}

// Based on http://www.nodegit.org/api/
declare module "nodegit" {
	export function Clone(url: string, local_path: string): Promise<Repository>;

	export namespace Ignore {
		export function pathIsIgnored(repo: Repository, path: string): Promise<boolean>;
	}

	export namespace Repository {
		export function open(path: string): Promise<Repository>;
	}

	export interface Repository {
		checkoutBranch(branch: string): Promise<void>;
		getCurrentBranch(): Promise<Reference>;
		fetchAll(): Promise<void>;
		mergeBranches(to: string, from: string): Promise<void>;
		getStatus(): Promise<StatusFile[]>;
	}

	export interface Reference {
		name(): string;
	}

	export interface StatusFile {
		path(): string;
	}
}
