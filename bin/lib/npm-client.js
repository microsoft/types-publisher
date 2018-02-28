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
class NpmClient {
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
                const params = {
                    access: "public",
                    auth: this.auth,
                    metadata,
                    body,
                };
                if (dry) {
                    resolve();
                }
                else {
                    this.client.publish(settings_1.npmRegistry, params, err => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }
            });
        });
    }
    tag(packageName, version, tag) {
        const params = {
            version,
            tag,
            auth: this.auth
        };
        return promisifyVoid(cb => { this.client.tag(packageUrl(packageName), params, cb); });
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
exports.default = NpmClient;
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
function fetchNpmInfo(escapedPackageName, fetcher) {
    return __awaiter(this, void 0, void 0, function* () {
        const info = yield fetcher.fetchJson({
            hostname: settings_1.npmRegistryHostName,
            path: escapedPackageName,
            retries: true,
        });
        if ("error" in info) {
            throw new Error(`Error getting version at ${escapedPackageName}: ${info.error}`);
        }
        return info;
    });
}
exports.fetchNpmInfo = fetchNpmInfo;
//# sourceMappingURL=npm-client.js.map