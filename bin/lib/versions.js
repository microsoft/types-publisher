"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require("fs");
const azure_container_1 = require("./azure-container");
const util_1 = require("./util");
const versionsFilename = "data/versions.json";
const changesFilename = "data/version-changes.txt";
class Versions {
    constructor(data) {
        this.data = data;
    }
    static loadFromBlob() {
        return __awaiter(this, void 0, void 0, function* () {
            return new this(yield azure_container_1.readJsonBlob(versionsFilename));
        });
    }
    static loadFromLocalFile() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Versions(yield util_1.readJson(versionsFilename));
        });
    }
    static existsSync() {
        return fs.existsSync(versionsFilename);
    }
    saveLocally() {
        return util_1.writeFile(versionsFilename, this.render());
    }
    recordUpdate(typing, forceUpdate) {
        const { lastVersion, lastContentHash } = this.getLastVersionAndContentHash(typing);
        const shouldIncrement = forceUpdate || lastContentHash !== typing.contentHash;
        if (shouldIncrement) {
            const key = typing.typingsPackageName;
            const newVersion = lastVersion + 1;
            this.data[key] = { lastVersion: newVersion, lastContentHash: typing.contentHash };
        }
        return shouldIncrement;
    }
    getVersion(typing) {
        return this.getLastVersionAndContentHash(typing).lastVersion;
    }
    getLastVersionAndContentHash(typing) {
        return this.data[typing.typingsPackageName] || { lastVersion: 0, lastContentHash: "" };
    }
    render() {
        return JSON.stringify(this.data, undefined, 4);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Versions;
function readChanges() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield util_1.readFile(changesFilename)).split("\n");
    });
}
exports.readChanges = readChanges;
function writeChanges(changes) {
    return util_1.writeFile(changesFilename, changes.join("\n"));
}
exports.writeChanges = writeChanges;
//# sourceMappingURL=versions.js.map