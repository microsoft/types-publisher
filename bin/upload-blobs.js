"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blob_uploader_1 = require("./lib/blob-uploader");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.logUncaughtErrors(blob_uploader_1.default(util_1.currentTimeStamp()));
}
exports.default = blob_uploader_1.default;
//# sourceMappingURL=upload-blobs.js.map