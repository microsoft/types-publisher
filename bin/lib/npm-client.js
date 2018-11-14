"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs_extra_1 = require("fs-extra");
const RegClient = require("npm-registry-client");
const url_1 = require("url");
const io_1 = require("../util/io");
const tgz_1 = require("../util/tgz");
const util_1 = require("../util/util");
const secrets_1 = require("./secrets");
const settings_1 = require("./settings");
function packageUrl(packageName) {
    return url_1.resolve(settings_1.npmRegistry, packageName);
}
const cacheDir = util_1.joinPaths(__dirname, "..", "..", "cache");
const cacheFile = util_1.joinPaths(cacheDir, "npmInfo.json");
class CachedNpmInfoClient {
    constructor(uncachedClient, cache) {
        this.uncachedClient = uncachedClient;
        this.cache = cache;
    }
    static async with(uncachedClient, cb) {
        const client = new this(uncachedClient, await fs_extra_1.pathExists(cacheFile)
            ? util_1.recordToMap(await io_1.readJson(cacheFile), npmInfoFromJson)
            : new Map());
        const res = await cb(client);
        await client.writeCache();
        return res;
    }
    /** May return old info -- caller should check that this looks up-to-date. */
    getNpmInfoFromCache(escapedPackageName) {
        return this.cache.get(escapedPackageName);
    }
    /** Call this when the result of getNpmInfoFromCache looks potentially out-of-date. */
    async fetchAndCacheNpmInfo(escapedPackageName) {
        const info = await this.uncachedClient.fetchNpmInfo(escapedPackageName);
        if (info) {
            this.cache.set(escapedPackageName, info);
        }
        return info;
    }
    async writeCache() {
        await fs_extra_1.ensureFile(cacheFile);
        await io_1.writeJson(cacheFile, util_1.mapToRecord(this.cache, jsonFromNpmInfo));
    }
}
exports.CachedNpmInfoClient = CachedNpmInfoClient;
class UncachedNpmInfoClient {
    constructor() {
        this.fetcher = new io_1.Fetcher();
    }
    async fetchNpmInfo(escapedPackageName) {
        const raw = await this.fetchRawNpmInfo(escapedPackageName);
        await io_1.sleep(0.01); // If we don't do this, npm resets the connection?
        return raw === undefined ? undefined : npmInfoFromJson(raw);
    }
    async fetchRawNpmInfo(escapedPackageName) {
        const info = await this.fetcher.fetchJson({
            hostname: settings_1.npmRegistryHostName,
            path: escapedPackageName,
            retries: true,
        });
        if ("error" in info) {
            if (info.error === "Not found") {
                return undefined;
            }
            throw new Error(`Error getting version at ${escapedPackageName}: ${info.error}`);
        }
        return info;
    }
    // See https://github.com/npm/download-counts
    async getDownloads(packageNames) {
        // NPM uses a different API if there's only a single name, so ensure there's at least 2.
        const names = packageNames.length === 1 ? [...packageNames, "dummy"] : packageNames;
        const nameGroups = Array.from(splitToFixedSizeGroups(names, 128)); // NPM has a limit of 128 packages at a time.
        const out = [];
        for (const nameGroup of nameGroups) {
            const data = await this.fetcher.fetchJson({
                hostname: settings_1.npmApi,
                path: `/downloads/point/last-month/${nameGroup.join(",")}`,
                retries: true,
            });
            if ("error" in data) {
                throw new Error(data.error);
            }
            for (const key in data) {
                assert(key === names[out.length]);
                out.push(data[key] ? data[key].downloads : 0);
            }
        }
        return out;
    }
}
exports.UncachedNpmInfoClient = UncachedNpmInfoClient;
function splitToFixedSizeGroups(names, chunkSize) {
    const out = [];
    for (let i = 0; i < names.length; i += chunkSize) {
        out.push(names.slice(i, i + chunkSize));
    }
    return out;
}
class NpmPublishClient {
    constructor(client, auth) {
        this.client = client;
        this.auth = auth;
    }
    static async create(config) {
        const token = await secrets_1.getSecret(secrets_1.Secret.NPM_TOKEN);
        return new this(new RegClient(config), { token });
    }
    async publish(publishedDirectory, packageJson, dry) {
        const readme = await io_1.readFile(util_1.joinPaths(publishedDirectory, "README.md"));
        return new Promise((resolve, reject) => {
            const body = tgz_1.createTgz(publishedDirectory, reject);
            const metadata = { readme, ...packageJson };
            resolve(dry ? undefined : promisifyVoid(cb => {
                this.client.publish(settings_1.npmRegistry, { access: "public", auth: this.auth, metadata, body }, cb);
            }));
        });
    }
    tag(packageName, version, tag) {
        return promisifyVoid(cb => { this.client.tag(packageUrl(packageName), { version, tag, auth: this.auth }, cb); });
    }
    deprecate(packageName, version, message) {
        const url = packageUrl(packageName.replace("/", "%2f"));
        const params = {
            message,
            version,
            auth: this.auth,
        };
        return promisifyVoid(cb => { this.client.deprecate(url, params, cb); });
    }
}
exports.NpmPublishClient = NpmPublishClient;
function npmInfoFromJson(n) {
    return {
        distTags: util_1.recordToMap(n["dist-tags"], util_1.identity),
        // Callback ensures we remove any other properties
        versions: util_1.recordToMap(n.versions, ({ typesPublisherContentHash, deprecated }) => ({ typesPublisherContentHash, deprecated })),
        timeModified: n.time.modified,
    };
}
function jsonFromNpmInfo(n) {
    return {
        "dist-tags": util_1.mapToRecord(n.distTags),
        versions: util_1.mapToRecord(n.versions),
        time: { modified: n.timeModified },
    };
}
function promisifyVoid(callsBack) {
    return new Promise((resolve, reject) => {
        callsBack(error => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=npm-client.js.map