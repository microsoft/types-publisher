"use strict";
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const source_map_support_1 = require("source-map-support");
const util_1 = require("./util");
source_map_support_1.install();
exports.home = path.join(__dirname, "..", "..");
exports.settings = util_1.parseJson(fs.readFileSync(path.join(exports.home, "settings.json"), "utf-8"));
exports.typesDataFilename = "definitions.json";
exports.notNeededPackagesPath = path.join(exports.settings.definitelyTypedPath, "notNeededPackages.json");
(function (RejectionReason) {
    RejectionReason[RejectionReason["TooManyFiles"] = 0] = "TooManyFiles";
    RejectionReason[RejectionReason["BadFileFormat"] = 1] = "BadFileFormat";
    RejectionReason[RejectionReason["ReferencePaths"] = 2] = "ReferencePaths";
})(exports.RejectionReason || (exports.RejectionReason = {}));
var RejectionReason = exports.RejectionReason;
exports.consoleLogger = { info: console.log, error: console.error };
class ArrayLog {
    constructor(alsoOutput = true) {
        this.alsoOutput = alsoOutput;
        this.infos = [];
        this.errors = [];
    }
    info(message) {
        if (this.alsoOutput) {
            console.log(message);
        }
        this.infos.push(message);
    }
    error(message) {
        if (this.alsoOutput) {
            console.error(message);
        }
        this.errors.push(message);
    }
    result() {
        return { infos: this.infos, errors: this.errors };
    }
}
exports.ArrayLog = ArrayLog;
function isNotNeededPackage(pkg) {
    return pkg.packageKind === "not-needed";
}
exports.isNotNeededPackage = isNotNeededPackage;
function isSuccess(t) {
    return t.data !== undefined;
}
exports.isSuccess = isSuccess;
function isFail(t) {
    return t.rejectionReason !== undefined;
}
exports.isFail = isFail;
function mkdir(p) {
    try {
        fs.statSync(p);
    }
    catch (e) {
        fs.mkdirSync(p);
    }
}
const logDir = path.join(exports.home, "logs");
function logPath(logName) {
    return path.join(logDir, logName);
}
exports.logPath = logPath;
function writeLogSync(logName, contents) {
    mkdir(logDir);
    fs.writeFileSync(logPath(logName), contents.join("\r\n"), "utf-8");
}
exports.writeLogSync = writeLogSync;
function writeDataFile(filename, content, formatted = true) {
    const dataDir = path.join(exports.home, "data");
    mkdir(dataDir);
    if (typeof content !== "string") {
        content = JSON.stringify(content, undefined, formatted ? 4 : undefined);
    }
    fs.writeFileSync(path.join(dataDir, filename), content, "utf-8");
}
exports.writeDataFile = writeDataFile;
const dataDir = path.join(exports.home, "data");
function dataFilePath(filename) {
    return path.join(dataDir, filename);
}
function existsDataFile(filename) {
    return fs.existsSync(dataFilePath(filename));
}
function readDataFile(filename) {
    const fullPath = dataFilePath(filename);
    if (fs.existsSync(fullPath)) {
        return util_1.parseJson(fs.readFileSync(fullPath, "utf-8"));
    }
    else {
        return undefined;
    }
}
exports.readDataFile = readDataFile;
function existsTypesDataFile() {
    return existsDataFile(exports.typesDataFilename);
}
exports.existsTypesDataFile = existsTypesDataFile;
function readTypesDataFile() {
    return readDataFile(exports.typesDataFilename);
}
exports.readTypesDataFile = readTypesDataFile;
function typings(typeData) {
    return Object.keys(typeData).map(packageName => typeData[packageName]);
}
exports.typings = typings;
function readTypings() {
    return typings(readTypesDataFile());
}
exports.readTypings = readTypings;
function readNotNeededPackages() {
    const raw = util_1.parseJson(fs.readFileSync(exports.notNeededPackagesPath, "utf-8")).packages;
    for (const pkg of raw) {
        assert(pkg.libraryName && pkg.typingsPackageName && pkg.sourceRepoURL);
        assert(!pkg.projectName && !pkg.packageKind && !pkg.globals && !pkg.declaredModules);
        pkg.projectName = pkg.sourceRepoURL;
        pkg.packageKind = "not-needed";
        pkg.globals = [];
        pkg.declaredModules = [];
    }
    return raw;
}
exports.readNotNeededPackages = readNotNeededPackages;
function computeHash(content) {
    // Normalize line endings
    content = content.replace(/\r\n?/g, "\n");
    const h = crypto.createHash("sha256");
    h.update(content, "utf-8");
    return h.digest("hex");
}
exports.computeHash = computeHash;
function definitelyTypedPath(dirName) {
    return path.join(exports.settings.definitelyTypedPath, dirName);
}
exports.definitelyTypedPath = definitelyTypedPath;
function getOutputPath({ typingsPackageName }) {
    return path.join(exports.settings.outputPath, typingsPackageName);
}
exports.getOutputPath = getOutputPath;
function fullPackageName(typingsPackageName) {
    return `@${exports.settings.scopeName}/${typingsPackageName.toLowerCase()}`;
}
exports.fullPackageName = fullPackageName;
function notNeededReadme({ libraryName, typingsPackageName, sourceRepoURL }) {
    return `This is a stub types definition for ${libraryName} (${sourceRepoURL}).
${libraryName} provides its own type definitions, so you don't need ${fullPackageName(typingsPackageName)} installed!`;
}
exports.notNeededReadme = notNeededReadme;
//# sourceMappingURL=common.js.map