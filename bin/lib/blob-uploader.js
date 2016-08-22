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
const fsp = require("fs-promise");
const path = require("path");
const container = require("./azure-container");
const logging_1 = require("./logging");
const util_1 = require("./util");
const maxNumberOfOldLogsDirectories = 5;
function uploadBlobsAndUpdateIssue(timeStamp) {
    return __awaiter(this, void 0, void 0, function* () {
        yield container.ensureCreated({ publicAccessLevel: "blob" });
        yield container.setCorsProperties();
        const [dataUrls, logUrls] = yield uploadBlobs(timeStamp);
        yield uploadIndex(timeStamp, dataUrls, logUrls);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = uploadBlobsAndUpdateIssue;
;
// View uploaded files at:
// https://ms.portal.azure.com/?flight=1#resource/subscriptions/99160d5b-9289-4b66-8074-ed268e739e8e/resourceGroups/types-publisher/providers/Microsoft.Storage/storageAccounts/typespublisher
function uploadBlobs(timeStamp) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.logger();
        const [dataUrls, logUrls] = yield Promise.all([
            yield uploadDirectory("data", "data", log),
            yield uploadLogs(timeStamp, log)
        ]);
        // Finally, output blob logs and upload them.
        const blobLogs = "upload-blobs.md";
        yield logging_1.writeLog(blobLogs, logResult());
        logUrls.push(yield uploadFile(logsUploadedLocation(timeStamp) + "/" + blobLogs, logging_1.logPath(blobLogs)));
        return [dataUrls, logUrls];
    });
}
;
const logsDirectoryName = "logs";
const logsPrefix = logsDirectoryName + "/";
function logsUploadedLocation(timeStamp) {
    return logsPrefix + timeStamp;
}
function uploadLogs(timeStamp, log) {
    return __awaiter(this, void 0, void 0, function* () {
        yield removeOldDirectories(logsPrefix, maxNumberOfOldLogsDirectories - 1, log);
        return yield uploadDirectory(logsUploadedLocation(timeStamp), logsDirectoryName, log, f => f !== "upload-blobs.md");
    });
}
function uploadDirectory(uploadedDirPath, dirPath, log, filter) {
    return __awaiter(this, void 0, void 0, function* () {
        let files = yield fsp.readdir(dirPath);
        if (filter) {
            files = files.filter(filter);
        }
        return yield Promise.all(files.map(fileName => {
            const fullPath = path.join(dirPath, fileName);
            const blobName = `${uploadedDirPath}/${fileName}`;
            return logAndUploadFile(blobName, fullPath, log);
        }));
    });
}
function logAndUploadFile(blobName, filePath, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = container.urlOfBlob(blobName);
        log(`Uploading ${filePath} to ${url}`);
        yield container.createBlobFromFile(blobName, filePath);
        return url;
    });
}
function uploadFile(blobName, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = container.urlOfBlob(blobName);
        yield container.createBlobFromFile(blobName, filePath);
        return url;
    });
}
function deleteDirectory(uploadedDirPath, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const blobs = yield container.listBlobs(uploadedDirPath);
        const blobNames = blobs.map(b => b.name);
        log(`Deleting directory ${uploadedDirPath}: delete files ${blobNames}`);
        yield Promise.all(blobNames.map(b => container.deleteBlob(b)));
    });
}
function removeOldDirectories(prefix, maxDirectories, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const list = yield container.listBlobs(prefix);
        const dirNames = util_1.unique(list.map(({ name }) => {
            assert(name.startsWith(prefix));
            return path.dirname(name.slice(prefix.length));
        }));
        if (dirNames.length <= maxDirectories) {
            log(`No need to remove old directories: have ${dirNames.length}, can go up to ${maxDirectories}.`);
            return;
        }
        // For ISO 8601 times, sorting lexicographically *is* sorting by time.
        const sortedNames = dirNames.sort();
        const toDelete = sortedNames.slice(0, sortedNames.length - maxDirectories);
        log(`Too many old logs, so removing the following directories: [${toDelete}]`);
        yield Promise.all(toDelete.map(d => deleteDirectory(prefix + d, log)));
    });
}
// Provides links to the latest blobs.
// These are at: https://typespublisher.blob.core.windows.net/typespublisher/index.html
function uploadIndex(timeStamp, dataUrls, logUrls) {
    return container.createBlobFromText("index.html", createIndex());
    function createIndex() {
        const lines = [];
        lines.push("<html><head></head><body>");
        lines.push(`<h3>Here is the latest data as of **${timeStamp}**:</h3>`);
        lines.push("<h4>Data</h4>");
        lines.push(...dataUrls.map(link));
        lines.push("<h4>Logs</h4>");
        lines.push(...logUrls.map(link));
        lines.push("</body></html>");
        return lines.join("\n");
        function link(url) {
            const short = url.slice(url.lastIndexOf("/") + 1);
            return `<li><a href='${url}'>${short}</a></li>`;
        }
    }
}
//# sourceMappingURL=blob-uploader.js.map