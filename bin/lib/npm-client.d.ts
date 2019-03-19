import RegClient = require("npm-registry-client");
import { Logger } from "../util/logging";
export declare type NpmInfoCache = ReadonlyMap<string, NpmInfo>;
export interface NpmInfoRaw {
    readonly "dist-tags": {
        readonly [tag: string]: string;
    };
    readonly versions: NpmInfoRawVersions;
    readonly time: {
        readonly [s: string]: string;
    };
}
export interface NpmInfoRawVersions {
    readonly [version: string]: NpmInfoVersion;
}
export interface NpmInfo {
    readonly distTags: Map<string, string>;
    readonly versions: Map<string, NpmInfoVersion>;
    readonly time: Map<string, string>;
}
export interface NpmInfoVersion {
    readonly typesPublisherContentHash?: string;
    readonly deprecated?: string;
}
export interface CachedNpmInfoClient {
    getNpmInfoFromCache(escapedPackageName: string): NpmInfo | undefined;
    fetchAndCacheNpmInfo(escapedPackageName: string): Promise<NpmInfo | undefined>;
}
export declare function withNpmCache<T>(uncachedClient: UncachedNpmInfoClient, cb: (client: CachedNpmInfoClient) => Promise<T>): Promise<T>;
export declare class UncachedNpmInfoClient {
    private readonly fetcher;
    fetchNpmInfo(escapedPackageName: string): Promise<NpmInfo | undefined>;
    fetchRawNpmInfo(escapedPackageName: string): Promise<NpmInfoRaw | undefined>;
    getDownloads(packageNames: ReadonlyArray<string>): Promise<ReadonlyArray<number>>;
}
export declare class NpmPublishClient {
    private readonly client;
    private readonly auth;
    static create(config?: RegClient.Config): Promise<NpmPublishClient>;
    private constructor();
    publish(publishedDirectory: string, packageJson: {}, dry: boolean, log: Logger): Promise<void>;
    tag(packageName: string, version: string, tag: string): Promise<void>;
    deprecate(packageName: string, version: string, message: string): Promise<void>;
}
