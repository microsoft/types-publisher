"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const azure_storage_1 = require("azure-storage");
const fs = require("fs");
const https = require("https");
const io_1 = require("../util/io");
const tgz_1 = require("../util/tgz");
const util_1 = require("../util/util");
const secrets_1 = require("./secrets");
const settings_1 = require("./settings");
class BlobWriter {
    constructor(service) {
        this.service = service;
    }
    static async create() {
        return new BlobWriter(azure_storage_1.createBlobService(settings_1.azureStorageAccount, await secrets_1.getSecret(secrets_1.Secret.AZURE_STORAGE_ACCESS_KEY)));
    }
    setCorsProperties() {
        const properties = {
            Cors: {
                CorsRule: [
                    {
                        AllowedOrigins: ["*"],
                        AllowedMethods: ["GET"],
                        AllowedHeaders: [],
                        ExposedHeaders: [],
                        MaxAgeInSeconds: 60 * 60 * 24 // 1 day
                    }
                ]
            }
        };
        return promisifyErrorOrResponse(cb => { this.service.setServiceProperties(properties, cb); });
    }
    ensureCreated(options) {
        return promisifyErrorOrResult(cb => {
            this.service.createContainerIfNotExists(settings_1.azureContainer, options, cb);
        });
    }
    createBlobFromFile(blobName, fileName) {
        return this.createBlobFromStream(blobName, fs.createReadStream(fileName));
    }
    createBlobFromText(blobName, text) {
        return this.createBlobFromStream(blobName, io_1.streamOfString(text));
    }
    async listBlobs(prefix) {
        const once = (token) => promisifyErrorOrResult(cb => {
            this.service.listBlobsSegmentedWithPrefix(settings_1.azureContainer, prefix, token, cb);
        });
        const out = [];
        let token;
        do {
            const { entries, continuationToken } = await once(token);
            out.push(...entries);
            token = continuationToken;
        } while (token);
        return out;
    }
    deleteBlob(blobName) {
        return promisifyErrorOrResponse(cb => {
            this.service.deleteBlob(settings_1.azureContainer, blobName, cb);
        });
    }
    createBlobFromStream(blobName, stream) {
        const options = {
            contentSettings: {
                contentEncoding: "GZIP",
                contentType: "application/json; charset=utf-8"
            }
        };
        // Remove `undefined!` once https://github.com/Azure/azure-storage-node/pull/267 is in
        return io_1.streamDone(tgz_1.gzip(stream).pipe(this.service.createWriteStreamToBlockBlob(settings_1.azureContainer, blobName, options, undefined)));
    }
}
exports.default = BlobWriter;
async function readBlob(blobName) {
    return new Promise((resolve, reject) => {
        const url = urlOfBlob(blobName);
        const req = https.get(url, res => {
            switch (res.statusCode) {
                case 200:
                    if (res.headers["content-encoding"] !== "GZIP") {
                        reject(new Error(`${url} is not gzipped`));
                    }
                    else {
                        resolve(io_1.stringOfStream(tgz_1.unGzip(res), blobName));
                    }
                    break;
                default:
                    reject(new Error(`Can't get ${url}: ${res.statusCode} error`));
            }
        });
        req.on("error", reject);
    });
}
exports.readBlob = readBlob;
async function readJsonBlob(blobName) {
    return util_1.parseJson(await readBlob(blobName));
}
exports.readJsonBlob = readJsonBlob;
function urlOfBlob(blobName) {
    return `https://${settings_1.azureContainer}.blob.core.windows.net/${settings_1.azureContainer}/${blobName}`;
}
exports.urlOfBlob = urlOfBlob;
function promisifyErrorOrResult(callsBack) {
    return new Promise((resolve, reject) => {
        callsBack((err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
}
function promisifyErrorOrResponse(callsBack) {
    return new Promise((resolve, reject) => {
        callsBack(err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=azure-container.js.map