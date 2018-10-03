"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs_extra_1 = require("fs-extra");
const https = require("https");
const tarStream = require("tar-stream");
const zlib = require("zlib");
const common_1 = require("./lib/common");
const settings_1 = require("./lib/settings");
const io_1 = require("./util/io");
const util_1 = require("./util/util");
function getDefinitelyTyped(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options.definitelyTypedPath === undefined) {
            yield fs_extra_1.ensureDir(common_1.dataDir);
            return downloadAndExtractFile(settings_1.definitelyTypedZipUrl);
        }
        else {
            const { error, stderr, stdout } = yield util_1.exec("git diff --name-only", options.definitelyTypedPath);
            if (error) {
                throw error;
            }
            if (stderr) {
                throw new Error(stderr);
            }
            if (stdout) {
                throw new Error(`'git diff' should be empty. Following files changed:\n${stdout}`);
            }
            return new DiskFS(`${options.definitelyTypedPath}/`);
        }
    });
}
exports.getDefinitelyTyped = getDefinitelyTyped;
function getLocallyInstalledDefinitelyTyped(path) {
    return new DiskFS(`${path}/`);
}
exports.getLocallyInstalledDefinitelyTyped = getLocallyInstalledDefinitelyTyped;
function downloadAndExtractFile(url) {
    return new Promise((resolve, reject) => {
        const root = new Dir(undefined);
        function insertFile(path, content) {
            const components = path.split("/");
            const baseName = util_1.assertDefined(components.pop());
            let dir = root;
            for (const component of components) {
                dir = dir.subdir(component);
            }
            dir.set(baseName, content);
        }
        https.get(url, response => {
            const extract = tarStream.extract();
            response.pipe(zlib.createGunzip()).pipe(extract);
            extract.on("entry", (header, stream, next) => {
                const name = util_1.assertDefined(util_1.withoutStart(header.name, "DefinitelyTyped-master/"));
                switch (header.type) {
                    case "file":
                        io_1.stringOfStream(stream, name).then(s => {
                            insertFile(name, s);
                            next();
                        }).catch(reject);
                        break;
                    case "directory":
                        next();
                        break;
                    default:
                        throw new Error(`Unexpected file system entry kind ${header.type}`);
                }
            });
            extract.on("error", reject);
            extract.on("finish", () => { resolve(new InMemoryDT(root, "")); });
        });
    });
}
// Map entries are Dir for directory and string for file.
class Dir extends Map {
    constructor(parent) {
        super();
        this.parent = parent;
    }
    subdir(name) {
        const x = this.get(name);
        if (x !== undefined) {
            if (typeof x === "string") {
                throw new Error(`File ${name} has same name as a directory?`);
            }
            return x;
        }
        const res = new Dir(this);
        this.set(name, res);
        return res;
    }
}
class InMemoryDT {
    /** pathToRoot is just for debugging */
    constructor(curDir, pathToRoot) {
        this.curDir = curDir;
        this.pathToRoot = pathToRoot;
    }
    tryGetEntry(path) {
        validatePath(path);
        if (path === "") {
            return this.curDir;
        }
        const components = path.split("/");
        const baseName = util_1.assertDefined(components.pop());
        let dir = this.curDir;
        for (const component of components) {
            const entry = component === ".." ? dir.parent : dir.get(component);
            if (!(entry instanceof Dir)) {
                throw new Error(`No file system entry at ${this.pathToRoot}/${path}. Siblings are: ${Array.from(dir.keys())}`);
            }
            dir = entry;
        }
        return dir.get(baseName);
    }
    getEntry(path) {
        const entry = this.tryGetEntry(path);
        if (entry === undefined) {
            throw new Error(`No file system entry at ${this.pathToRoot}/${path}`);
        }
        return entry;
    }
    getDir(dirPath) {
        const res = this.getEntry(dirPath);
        if (!(res instanceof Dir)) {
            throw new Error(`${this.pathToRoot}/${dirPath} is a file, not a directory.`);
        }
        return res;
    }
    readFile(filePath) {
        const res = this.getEntry(filePath);
        if (typeof res !== "string") {
            throw new Error(`${this.pathToRoot}/${filePath} is a directory, not a file.`);
        }
        return res;
    }
    readdir(dirPath) {
        return Array.from((dirPath === undefined ? this.curDir : this.getDir(dirPath)).keys());
    }
    readJson(path) {
        return JSON.parse(this.readFile(path));
    }
    isDirectory(path) {
        return typeof this.getEntry(path) !== "string";
    }
    exists(path) {
        return this.tryGetEntry(path) !== undefined;
    }
    subDir(path) {
        return new InMemoryDT(this.getDir(path), util_1.joinPaths(this.pathToRoot, path));
    }
    debugPath() {
        return this.pathToRoot;
    }
}
class DiskFS {
    constructor(rootPrefix) {
        this.rootPrefix = rootPrefix;
        assert(rootPrefix.endsWith("/"));
    }
    getPath(path) {
        if (path === undefined) {
            return this.rootPrefix;
        }
        else {
            validatePath(path);
            return this.rootPrefix + path;
        }
    }
    readdir(dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield fs_extra_1.readdir(this.getPath(dirPath))).filter(name => name !== ".DS_STORE");
        });
    }
    isDirectory(dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield fs_extra_1.stat(this.getPath(dirPath))).isDirectory();
        });
    }
    readJson(path) {
        return io_1.readJson(this.getPath(path));
    }
    readFile(path) {
        return io_1.readFile(this.getPath(path));
    }
    exists(path) {
        return fs_extra_1.pathExists(this.getPath(path));
    }
    subDir(path) {
        return new DiskFS(`${this.rootPrefix}${path}/`);
    }
    debugPath() {
        return this.rootPrefix;
    }
}
/** FS only handles simple paths like `foo/bar` or `../foo`. No `./foo` or `/foo`. */
function validatePath(path) {
    if (path.startsWith(".") && path !== ".editorconfig" && !path.startsWith("../")
        || path.startsWith("/")
        || path.endsWith("/")) {
        throw new Error(`Unexpected path ${path}`);
    }
}
//# sourceMappingURL=get-definitely-typed.js.map