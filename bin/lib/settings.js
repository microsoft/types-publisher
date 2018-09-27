"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
/** URL of the NPM registry to upload to. */
exports.npmRegistryHostName = "registry.npmjs.org";
exports.npmRegistry = `https://${exports.npmRegistryHostName}/`;
exports.npmApi = "api.npmjs.org";
/** Note: this is 'types' and not '@types' */
exports.scopeName = "types";
exports.outputPath = "./output";
exports.validateOutputPath = path_1.join(__dirname, "..", "..", "validateOutput");
/** URL to download the repository from. */
exports.definitelyTypedZipUrl = "https://codeload.github.com/DefinitelyTyped/DefinitelyTyped/tar.gz/master";
/** The branch that DefinitelyTyped is sourced from. */
exports.sourceBranch = "master";
/** Name of the azure storage account. Used for uploading data and logs. */
exports.azureStorageAccount = "typespublisher";
/** Name of the azure container. */
exports.azureContainer = "typespublisher";
/** URL of azure keyvault. */
exports.azureKeyvault = "https://types-publisher-keys.vault.azure.net";
/** Issue in types-publisher that we will use to report webhook errors. */
exports.errorsIssue = "Microsoft/types-publisher/issues/40";
exports.typesDirectoryName = "types";
exports.dependenciesWhitelist = new Set(fs_1.readFileSync(path_1.join(__dirname, "..", "..", "dependenciesWhitelist.txt"), "utf-8").split(/\r?\n/));
//# sourceMappingURL=settings.js.map