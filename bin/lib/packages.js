"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const assert = require("assert");
const path = require("path");
const io_1 = require("../util/io");
const util_1 = require("../util/util");
const common_1 = require("./common");
class AllPackages {
    constructor(data, notNeeded) {
        this.data = data;
        this.notNeeded = notNeeded;
    }
    static read(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield readTypesDataFile();
            const map = util_1.mapValues(new Map(Object.entries(data)), raw => new TypingsData(raw));
            const notNeeded = (yield readNotNeededPackages(options)).map(raw => new NotNeededPackage(raw));
            return new AllPackages(map, notNeeded);
        });
    }
    static readTypings() {
        return __awaiter(this, void 0, void 0, function* () {
            return Object.values(yield readTypesDataFile()).map(raw => new TypingsData(raw));
        });
    }
    static readSingle(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield readTypesDataFile();
            const raw = data[name];
            if (!raw) {
                throw new Error(`Can't find package ${name}`);
            }
            return new TypingsData(raw);
        });
    }
    getAnyPackage(name) {
        let pkg = this.tryGetTypingsData(name) || this.notNeeded.find(p => p.typingsPackageName === name);
        if (!pkg) {
            throw new Error(`Expected to find a package named ${name}`);
        }
        return pkg;
    }
    tryGetTypingsData(packageName) {
        return this.data.get(packageName);
    }
    hasTypingFor(packageName) {
        return this.data.has(packageName);
    }
    getTypingsData(packageName) {
        const pkg = this.tryGetTypingsData(packageName);
        if (!pkg) {
            throw new Error(`Can't find package ${packageName}`);
        }
        return pkg;
    }
    allPackages() {
        return this.allTypings().concat(this.allNotNeeded());
    }
    allTypings() {
        return Array.from(this.data.values());
    }
    allNotNeeded() {
        return this.notNeeded;
    }
}
exports.AllPackages = AllPackages;
exports.typesDataFilename = "definitions.json";
/** Prefer to use `AnyPackage` instead of this. */
class PackageBase {
    constructor(data) {
        Object.assign(this, data);
    }
    isNotNeeded() {
        return this instanceof NotNeededPackage;
    }
    getOutputPath() {
        return path.join(outputDir, this.typingsPackageName);
    }
    fullName() {
        return fullPackageName(this.typingsPackageName);
    }
    fullEscapedName() {
        return `@${common_1.settings.scopeName}%2f${this.typingsPackageName}`;
    }
    outputDir() {
        return path.join(outputDir, this.typingsPackageName);
    }
}
exports.PackageBase = PackageBase;
function fullPackageName(packageName) {
    return `@${common_1.settings.scopeName}/${packageName}`;
}
exports.fullPackageName = fullPackageName;
const outputDir = path.join(common_1.home, common_1.settings.outputPath);
class NotNeededPackage extends PackageBase {
    readme(useNewline = true) {
        const lines = [
            `This is a stub types definition for ${this.libraryName} (${this.sourceRepoURL}).`,
            `${this.libraryName} provides its own type definitions, so you don't need ${fullPackageName(this.typingsPackageName)} installed!`
        ];
        return lines.join(useNewline ? "\n" : " ");
    }
}
exports.NotNeededPackage = NotNeededPackage;
class TypingsData extends PackageBase {
    directoryPath(options) {
        return definitelyTypedPath(this.typingsPackageName, options);
    }
    filePath(fileName, options) {
        return path.join(this.directoryPath(options), fileName);
    }
}
exports.TypingsData = TypingsData;
function readTypesDataFile() {
    return common_1.readDataFile("parse-definitions", exports.typesDataFilename);
}
function notNeededPackagesPath(options) {
    return path.join(options.definitelyTypedPath, "notNeededPackages.json");
}
function readNotNeededPackages(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const raw = (yield io_1.readJson(notNeededPackagesPath(options))).packages;
        for (const pkg of raw) {
            for (const key in pkg) {
                if (!["libraryName", "typingsPackageName", "sourceRepoURL", "asOfVersion"].includes(key)) {
                    throw new Error(`Unexpected key in not-needed package: ${key}`);
                }
            }
            assert(pkg.libraryName && pkg.typingsPackageName && pkg.sourceRepoURL);
            assert(typeof pkg.asOfVersion === "string" || pkg.asOfVersion === undefined);
            assert(!pkg.projectName && !pkg.packageKind && !pkg.globals && !pkg.declaredModules);
            pkg.projectName = pkg.sourceRepoURL;
            pkg.packageKind = "not-needed";
            pkg.globals = [];
            pkg.declaredModules = [];
        }
        return raw;
    });
}
function definitelyTypedPath(dirName, options) {
    return path.join(options.definitelyTypedPath, dirName);
}
exports.definitelyTypedPath = definitelyTypedPath;
var TypeScriptVersion;
(function (TypeScriptVersion) {
    TypeScriptVersion.All = ["2.0", "2.1"];
    TypeScriptVersion.Latest = "2.1";
    function isPrerelease(version) {
        return version === "2.1";
    }
    TypeScriptVersion.isPrerelease = isPrerelease;
    /** List of NPM tags that should be changed to point to the latest version. */
    function tagsToUpdate(typeScriptVersion) {
        switch (typeScriptVersion) {
            case "2.0":
                // A 2.0-compatible package is assumed compatible with TypeScript 2.1
                // We want the "2.1" tag to always exist.
                return [tags.latest, tags.v2_0, tags.v2_1];
            case "2.1":
                // Eventually this will change to include "latest", too.
                // And obviously we shouldn't advance the "2.0" tag if the package is now 2.1-specific.
                return [tags.v2_1];
        }
    }
    TypeScriptVersion.tagsToUpdate = tagsToUpdate;
    var tags;
    (function (tags) {
        tags.latest = "latest";
        tags.v2_0 = "ts2.0";
        tags.v2_1 = "ts2.1";
    })(tags || (tags = {}));
})(TypeScriptVersion = exports.TypeScriptVersion || (exports.TypeScriptVersion = {}));
//# sourceMappingURL=packages.js.map