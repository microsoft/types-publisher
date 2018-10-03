"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs_extra_1 = require("fs-extra");
const RegClient = require("npm-registry-client");
const url = require("url");
const io_1 = require("../util/io");
const tgz_1 = require("../util/tgz");
const util_1 = require("../util/util");
const secrets_1 = require("./secrets");
const settings_1 = require("./settings");
function packageUrl(packageName) {
    return url.resolve(settings_1.npmRegistry, packageName);
}
const cacheDir = util_1.joinPaths(__dirname, "..", "..", "cache");
const cacheFile = util_1.joinPaths(cacheDir, "npmInfo.json");
class CachedNpmInfoClient {
    constructor(uncachedClient, cache) {
        this.uncachedClient = uncachedClient;
        this.cache = cache;
    }
    static with(uncachedClient, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = new this(uncachedClient, (yield fs_extra_1.pathExists(cacheFile))
                ? util_1.recordToMap(yield io_1.readJson(cacheFile), npmInfoFromJson)
                : new Map());
            const res = yield cb(client);
            yield client.writeCache();
            return res;
        });
    }
    getNpmInfo(escapedPackageName, contentHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const cached = this.cache.get(escapedPackageName);
            if (cached !== undefined && contentHash !== undefined &&
                cached.versions.get(cached.distTags.get("latest")).typesPublisherContentHash === contentHash) {
                return cached;
            }
            const info = yield this.uncachedClient.fetchNpmInfo(escapedPackageName);
            if (info !== undefined && contentHash !== undefined) {
                this.cache.set(escapedPackageName, info);
            }
            return info;
        });
    }
    writeCache() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs_extra_1.ensureFile(cacheFile);
            yield io_1.writeJson(cacheFile, util_1.mapToRecord(this.cache, jsonFromNpmInfo));
        });
    }
}
exports.CachedNpmInfoClient = CachedNpmInfoClient;
class UncachedNpmInfoClient {
    constructor() {
        this.fetcher = new io_1.Fetcher();
    }
    fetchNpmInfo(escapedPackageName) {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = yield this.fetchRawNpmInfo(escapedPackageName);
            yield io_1.sleep(0.01); // If we don't do this, npm resets the connection?
            return raw === undefined ? undefined : npmInfoFromJson(raw);
        });
    }
    fetchRawNpmInfo(escapedPackageName) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = yield this.fetcher.fetchJson({
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
        });
    }
    // See https://github.com/npm/download-counts
    getDownloads(packageNames) {
        return __awaiter(this, void 0, void 0, function* () {
            // NPM uses a different API if there's only a single name, so ensure there's at least 2.
            const names = packageNames.length === 1 ? [...packageNames, "dummy"] : packageNames;
            const nameGroups = Array.from(splitToFixedSizeGroups(names, 128)); // NPM has a limit of 128 packages at a time.
            const out = [];
            for (const nameGroup of nameGroups) {
                const data = yield this.fetcher.fetchJson({
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
        });
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
    static create(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield secrets_1.getSecret(secrets_1.Secret.NPM_TOKEN);
            return new this(new RegClient(config), { token });
        });
    }
    publish(publishedDirectory, packageJson, dry) {
        return __awaiter(this, void 0, void 0, function* () {
            const readme = yield io_1.readFile(util_1.joinPaths(publishedDirectory, "README.md"));
            return new Promise((resolve, reject) => {
                const body = tgz_1.createTgz(publishedDirectory, reject);
                const metadata = Object.assign({ readme }, packageJson);
                resolve(dry ? undefined : promisifyVoid(cb => {
                    this.client.publish(settings_1.npmRegistry, { access: "public", auth: this.auth, metadata, body }, cb);
                }));
            });
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