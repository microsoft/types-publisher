"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const azure_storage_1 = require("azure-storage");
const fs = require("fs");
const https = require("https");
const common_1 = require("./common");
const util_1 = require("./util");
const name = common_1.settings.azureContainer;
const service = azure_storage_1.createBlobService(common_1.settings.azureStorageAccount, process.env["AZURE_STORAGE_ACCESS_KEY"]);
function setCorsProperties() {
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
    return promisifyErrorOrResponse(cb => service.setServiceProperties(properties, cb));
}
exports.setCorsProperties = setCorsProperties;
function ensureCreated(options) {
    return promisifyErrorOrResult(cb => service.createContainerIfNotExists(name, options, cb)).then(() => { });
}
exports.ensureCreated = ensureCreated;
function createBlobFromFile(blobName, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        return createBlobFromStream(blobName, fs.createReadStream(fileName));
    });
}
exports.createBlobFromFile = createBlobFromFile;
function createBlobFromText(blobName, text) {
    return __awaiter(this, void 0, void 0, function* () {
        return createBlobFromStream(blobName, util_1.streamOfString(text));
    });
}
exports.createBlobFromText = createBlobFromText;
function createBlobFromStream(blobName, stream) {
    const options = {
        contentSettings: {
            contentEncoding: "GZIP",
            contentType: "application/json; charset=utf-8"
        }
    };
    return streamDone(util_1.gzip(stream).pipe(service.createWriteStreamToBlockBlob(name, blobName, options)));
}
function streamDone(stream) {
    return new Promise((resolve, reject) => {
        stream.on("error", reject).on("finish", resolve);
    });
}
function readBlob(blobName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const url = urlOfBlob(blobName);
            const req = https.get(url, res => {
                switch (res.statusCode) {
                    case 200:
                        if (res.headers["content-encoding"] !== "GZIP") {
                            reject(new Error(`${url} is not gzipped`));
                        }
                        else {
                            resolve(util_1.stringOfStream(util_1.unGzip(res)));
                        }
                        break;
                    default:
                        reject(new Error(`Can't get ${url}: ${res.statusCode} error`));
                }
            });
            req.on("error", reject);
        });
    });
}
exports.readBlob = readBlob;
function readJsonBlob(blobName) {
    return __awaiter(this, void 0, void 0, function* () {
        return util_1.parseJson(yield readBlob(blobName));
    });
}
exports.readJsonBlob = readJsonBlob;
function listBlobs(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        const once = (token) => promisifyErrorOrResult(cb => service.listBlobsSegmentedWithPrefix(name, prefix, token, cb));
        const out = [];
        let token = undefined;
        do {
            const { entries, continuationToken } = yield once(token);
            out.push(...entries);
            token = continuationToken;
        } while (token);
        return out;
    });
}
exports.listBlobs = listBlobs;
function deleteBlob(blobName) {
    return promisifyErrorOrResponse(cb => service.deleteBlob(name, blobName, cb));
}
exports.deleteBlob = deleteBlob;
function urlOfBlob(blobName) {
    return `https://${name}.blob.core.windows.net/${name}/${blobName}`;
}
exports.urlOfBlob = urlOfBlob;
function promisifyErrorOrResult(callsBack) {
    return new Promise((resolve, reject) => {
        callsBack((err, result, response) => {
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
        callsBack((err, response) => {
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