"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const azure_container_1 = require("./azure-container");
const maxNumberOfOldLogsDirectories = 5;
async function uploadBlobsAndUpdateIssue(timeStamp) {
    const container = await azure_container_1.default.create();
    await container.ensureCreated({ publicAccessLevel: "blob" });
    await container.setCorsProperties();
    const [dataUrls, logUrls] = await uploadBlobs(container, timeStamp);
    await uploadIndex(container, timeStamp, dataUrls, logUrls);
}
exports.default = uploadBlobsAndUpdateIssue;
// View uploaded files at: https://ms.portal.azure.com under "typespublisher"
async function uploadBlobs(container, timeStamp) {
    const [log, logResult] = logging_1.logger();
    const [dataUrls, logUrls] = await Promise.all([
        await uploadDirectory(container, "data", "data", log),
        await uploadLogs(container, timeStamp, log),
    ]);
    // Finally, output blob logs and upload them.
    const blobLogs = "upload-blobs.md";
    await logging_1.writeLog(blobLogs, logResult());
    logUrls.push(await uploadFile(container, `${logsUploadedLocation(timeStamp)}/${blobLogs}`, logging_1.logPath(blobLogs)));
    return [dataUrls, logUrls];
}
const logsDirectoryName = "logs";
const logsPrefix = `${logsDirectoryName}/`;
function logsUploadedLocation(timeStamp) {
    return logsPrefix + timeStamp;
}
async function uploadLogs(container, timeStamp, log) {
    await removeOldDirectories(container, logsPrefix, maxNumberOfOldLogsDirectories - 1, log);
    return uploadDirectory(container, logsUploadedLocation(timeStamp), logsDirectoryName, log, f => f !== "upload-blobs.md");
}
async function uploadDirectory(container, uploadedDirPath, dirPath, log, filter) {
    let files = await fs_extra_1.readdir(dirPath);
    if (filter) {
        files = files.filter(filter);
    }
    return Promise.all(files.map(fileName => {
        const fullPath = util_1.joinPaths(dirPath, fileName);
        const blobName = util_1.joinPaths(uploadedDirPath, fileName);
        return logAndUploadFile(container, blobName, fullPath, log);
    }));
}
async function logAndUploadFile(container, blobName, filePath, log) {
    const url = azure_container_1.urlOfBlob(blobName);
    log(`Uploading ${filePath} to ${url}`);
    await container.createBlobFromFile(blobName, filePath);
    return url;
}
async function uploadFile(container, blobName, filePath) {
    const url = azure_container_1.urlOfBlob(blobName);
    await container.createBlobFromFile(blobName, filePath);
    return url;
}
async function deleteDirectory(container, uploadedDirPath, log) {
    const blobs = await container.listBlobs(uploadedDirPath);
    const blobNames = blobs.map(b => b.name);
    log(`Deleting directory ${uploadedDirPath}: delete files ${blobNames}`);
    await Promise.all(blobNames.map(b => container.deleteBlob(b)));
}
async function removeOldDirectories(container, prefix, maxDirectories, log) {
    const list = await container.listBlobs(prefix);
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
    await Promise.all(toDelete.map(d => deleteDirectory(container, prefix + d, log)));
}
// Provides links to the latest blobs.
// These are at: https://typespublisher.blob.core.windows.net/typespublisher/index.html
function uploadIndex(container, timeStamp, dataUrls, logUrls) {
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