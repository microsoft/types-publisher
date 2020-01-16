"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const appInsights = require("applicationinsights");
const assert = require("assert");
const fs_extra_1 = require("fs-extra");
const https = require("https");
const tarStream = require("tar-stream");
const yargs = require("yargs");
const zlib = require("zlib");
const common_1 = require("./lib/common");
const settings_1 = require("./lib/settings");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
        appInsights.setup();
        appInsights.start();
    }
    const dry = !!yargs.argv.dry;
    console.log("gettingDefinitelyTyped: " + (dry ? "from github" : "locally"));
    util_1.logUncaughtErrors(async () => {
        const dt = await getDefinitelyTyped(dry ? common_1.Options.azure : common_1.Options.defaults, logging_1.loggerWithErrors()[0]);
        assert(dt.exists("types"));
        assert(!(dt.exists("buncho")));
    });
}
async function getDefinitelyTyped(options, log) {
    if (options.definitelyTypedPath === undefined) {
        log.info("Downloading Definitely Typed ...");
        await fs_extra_1.ensureDir(settings_1.dataDirPath);
        return downloadAndExtractFile(settings_1.definitelyTypedZipUrl);
    }
    else {
        const { error, stderr, stdout } = await util_1.exec("git diff --name-only", options.definitelyTypedPath);
        if (error) {
            throw error;
        }
        if (stderr) {
            throw new Error(stderr);
        }
        if (stdout) {
            throw new Error(`'git diff' should be empty. Following files changed:\n${stdout}`);
        }
        log.info(`Using local Definitely Typed at ${options.definitelyTypedPath}.`);
        return new DiskFS(`${options.definitelyTypedPath}/`);
    }
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
            extract.on("finish", () => { resolve(new InMemoryDT(root.finish(), "")); });
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
    finish() {
        const out = new Dir(this.parent);
        for (const key of Array.from(this.keys()).sort()) {
            const subDirOrFile = this.get(key);
            out.set(key, typeof subDirOrFile === "string" ? subDirOrFile : subDirOrFile.finish());
        }
        return out;
    }
}
exports.Dir = Dir;
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
            if (entry === undefined) {
                return undefined;
            }
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
exports.InMemoryDT = InMemoryDT;
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
        return fs_extra_1.readdirSync(this.getPath(dirPath)).sort().filter(name => name !== ".DS_Store");
    }
    isDirectory(dirPath) {
        return fs_extra_1.statSync(this.getPath(dirPath)).isDirectory();
    }
    readJson(path) {
        return io_1.readJsonSync(this.getPath(path));
    }
    readFile(path) {
        return io_1.readFileSync(this.getPath(path));
    }
    exists(path) {
        return fs_extra_1.pathExistsSync(this.getPath(path));
    }
    subDir(path) {
        return new DiskFS(`${this.rootPrefix}${path}/`);
    }
    debugPath() {
        return this.rootPrefix.slice(0, this.rootPrefix.length - 1); // remove trailing '/'
    }
}
/** FS only handles simple paths like `foo/bar` or `../foo`. No `./foo` or `/foo`. */
function validatePath(path) {
    if (path.startsWith(".") && path !== ".editorconfig" && !path.startsWith("../")) {
        throw new Error(`${path}: filesystem doesn't support paths of the form './x'.`);
    }
    else if (path.startsWith("/")) {
        throw new Error(`${path}: filesystem doesn't support paths of the form '/xxx'.`);
    }
    else if (path.endsWith("/")) {
        throw new Error(`${path}: filesystem doesn't support paths of the form 'xxx/'.`);
    }
}
//# sourceMappingURL=get-definitely-typed.js.map