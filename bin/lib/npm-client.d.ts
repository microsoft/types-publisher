import RegClient = require("npm-registry-client");
import { Logger } from "../util/logging";
export declare type NpmInfoCache = ReadonlyMap<string, NpmInfo>;
export interface NpmInfoRaw {
    readonly "dist-tags": {
        readonly [tag: string]: string;
    };
    readonly versions: NpmInfoRawVersions;
    readonly time: {
        readonly modified: string;
    };
}
export interface NpmInfoRawVersions {
    readonly [version: string]: NpmInfoVersion;
}
export interface NpmInfo {
    readonly distTags: Map<string, string>;
    readonly versions: Map<string, NpmInfoVersion>;
    readonly timeModified: string;
}
export interface NpmInfoVersion {
    readonly typesPublisherContentHash?: string;
    readonly deprecated?: string;
}
export declare class CachedNpmInfoClient {
    private readonly uncachedClient;
    private readonly cache;
    static with<T>(uncachedClient: UncachedNpmInfoClient, cb: (client: CachedNpmInfoClient) => Promise<T>): Promise<T>;
    private constructor();
    /** May return old info -- caller should check that this looks up-to-date. */
    getNpmInfoFromCache(escapedPackageName: string): NpmInfo | undefined;
    /** Call this when the result of getNpmInfoFromCache looks potentially out-of-date. */
    fetchAndCacheNpmInfo(escapedPackageName: string): Promise<NpmInfo | undefined>;
    private writeCache;
    formatKeys(): string;
}
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
