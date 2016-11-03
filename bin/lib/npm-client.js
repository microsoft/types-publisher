"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require("assert");
const RegClient = require("npm-registry-client");
const path = require("path");
const url = require("url");
const io_1 = require("../util/io");
const tgz_1 = require("../util/tgz");
const common_1 = require("./common");
const secrets_1 = require("./secrets");
const registry = common_1.settings.npmRegistry;
assert(registry.endsWith("/"));
function packageUrl(packageName) {
    return url.resolve(registry, packageName);
}
class NpmClient {
    constructor(client, auth) {
        this.client = client;
        this.auth = auth;
    }
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield secrets_1.getSecret(secrets_1.Secret.NPM_TOKEN);
            return new this(new RegClient({}), { token });
        });
    }
    publish(publishedDirectory, packageJson, dry) {
        return __awaiter(this, void 0, void 0, function* () {
            const readme = yield io_1.readFile(path.join(publishedDirectory, "README.md"));
            return new Promise((resolve, reject) => {
                const body = tgz_1.createTgz(publishedDirectory, reject);
                const metadata = Object.assign({ readme }, packageJson);
                const params = {
                    access: "public",
                    auth: this.auth,
                    metadata,
                    body
                };
                if (dry) {
                    resolve();
                }
                else {
                    this.client.publish(registry, params, err => {
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
        return promisifyVoid(cb => this.client.tag(packageUrl(packageName), params, cb));
    }
    deprecate(packageName, version, message) {
        const url = packageUrl(packageName.replace("/", "%2f"));
        const params = {
            message,
            version,
            auth: this.auth,
        };
        return promisifyVoid(cb => this.client.deprecate(url, params, cb));
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=npm-client.js.map