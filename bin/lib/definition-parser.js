"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fsp = require("fs-promise");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const header_1 = require("./header");
const module_info_1 = require("./module-info");
const packages_1 = require("./packages");
function getTypingInfo(packageName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packageName !== packageName.toLowerCase()) {
            throw new Error(`Package name \`${packageName}\` should be strictly lowercase`);
        }
        const rootDirectory = packages_1.packageRootPath(packageName, options);
        const { rootDirectoryLs, olderVersionDirectories } = yield getOlderVersions(rootDirectory);
        const { data: latestData, logs: latestLogs } = yield getTypingData(packageName, rootDirectory, rootDirectoryLs);
        const latestVersion = latestData.libraryMajorVersion;
        const [log, logResult] = logging_1.quietLogger();
        logging_1.moveLogs(log, latestLogs);
        const older = yield util_1.mapAsyncOrdered(olderVersionDirectories, ({ directoryName, majorVersion }) => __awaiter(this, void 0, void 0, function* () {
            if (majorVersion === latestVersion) {
                throw new Error(`The latest major version is ${latestVersion}, but a directory v${latestVersion} exists.`);
            }
            const directory = util_1.joinPaths(rootDirectory, directoryName);
            const files = yield fsp.readdir(directory);
            const { data, logs } = yield getTypingData(packageName, directory, files, majorVersion);
            log(`Parsing older version ${majorVersion}`);
            logging_1.moveLogs(log, logs, (msg) => "    " + msg);
            if (data.libraryMajorVersion !== majorVersion) {
                throw new Error(`Directory ${directory} indicates major version ${majorVersion}, but header indicates major version ${data.libraryMajorVersion}`);
            }
            return data;
        }));
        const data = {};
        data[latestVersion] = latestData;
        for (const o of older) {
            data[o.libraryMajorVersion] = o;
        }
        return { data, logs: logResult() };
    });
}
exports.getTypingInfo = getTypingInfo;
function getOlderVersions(rootDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        const lsRootDirectory = yield fsp.readdir(rootDirectory);
        const rootDirectoryLs = [];
        const olderVersionDirectories = [];
        for (const fileOrDirectoryName of lsRootDirectory) {
            const majorVersion = parseMajorVersionFromDirectoryName(fileOrDirectoryName);
            if (majorVersion === undefined) {
                rootDirectoryLs.push(fileOrDirectoryName);
            }
            else {
                olderVersionDirectories.push({ directoryName: fileOrDirectoryName, majorVersion });
            }
        }
        return { rootDirectoryLs, olderVersionDirectories };
    });
}
function parseMajorVersionFromDirectoryName(directoryName) {
    const match = /^v(\d+)$/.exec(directoryName);
    return match === null ? undefined : Number(match[1]);
}
exports.parseMajorVersionFromDirectoryName = parseMajorVersionFromDirectoryName;
/**
 * @param packageName Name of the outermost directory; e.g. for "node/v4" this is just "node".
 * @param directory Full path to the directory for this package; e.g. "../DefinitelyTyped/foo/v3".
 * @param ls All file/directory names in `directory`.
 */
function getTypingData(packageName, directory, ls, oldMajorVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        log(`Reading contents of ${directory}`);
        // There is a *single* main file, containing metadata comments.
        // But there may be many entryFilenames, which are the starting points of inferring all files to be included.
        const mainFilename = "index.d.ts";
        const { authors, libraryMajorVersion, libraryMinorVersion, typeScriptVersion, libraryName, projects } = header_1.parseHeaderOrFail(yield readFile(directory, mainFilename), packageName);
        const { typeFiles, testFiles } = yield entryFilesFromTsConfig(packageName, directory);
        const { dependencies: dependenciesSet, globals, declaredModules, declFiles } = yield module_info_1.default(packageName, directory, typeFiles, log);
        const dependencies = yield calculateDependencies(packageName, directory, dependenciesSet, oldMajorVersion);
        const hasPackageJson = yield fsp.exists(util_1.joinPaths(directory, "package.json"));
        const allContentHashFiles = hasPackageJson ? declFiles.concat(["package.json"]) : declFiles;
        const allFiles = new Set(allContentHashFiles.concat(testFiles, ["tsconfig.json", "tslint.json"]));
        yield checkAllFilesUsed(directory, ls, allFiles);
        // Double-check that no windows "\\" broke in.
        for (const fileName of allContentHashFiles) {
            if (util_1.hasWindowsSlashes(fileName)) {
                throw new Error(`In ${packageName}: windows slash detected in ${fileName}`);
            }
        }
        const sourceRepoURL = "https://www.github.com/DefinitelyTyped/DefinitelyTyped";
        const data = {
            authors: authors.map(a => `${a.name} <${a.url}>`).join(", "),
            dependencies,
            libraryMajorVersion,
            libraryMinorVersion,
            typeScriptVersion,
            libraryName,
            typingsPackageName: packageName,
            projectName: projects[0],
            sourceRepoURL,
            globals,
            declaredModules,
            files: declFiles,
            hasPackageJson,
            contentHash: yield hash(directory, allContentHashFiles)
        };
        return { data, logs: logResult() };
    });
}
function entryFilesFromTsConfig(packageName, directory) {
    return __awaiter(this, void 0, void 0, function* () {
        const tsconfigPath = util_1.joinPaths(directory, "tsconfig.json");
        const tsconfig = yield fsp.readJson(tsconfigPath);
        if (tsconfig.include) {
            throw new Error(`${tsconfigPath}: Don't use "include", must use "files"`);
        }
        const files = tsconfig.files;
        if (!files) {
            throw new Error(`${tsconfigPath} needs to specify  "files"`);
        }
        const typeFiles = [];
        const testFiles = [];
        for (const file of files) {
            if (file.startsWith("./")) {
                throw new Error(`In ${tsconfigPath}: Unnecessary "./" at the start of ${file}`);
            }
            if (file.endsWith(".d.ts")) {
                typeFiles.push(file);
            }
            else {
                if (!file.startsWith("test/")) {
                    const expectedName = `${packageName}-tests.ts`;
                    if (file !== expectedName && file !== expectedName + "x") {
                        throw new Error(`In ${directory}: Expected file '${file}' to be named ${expectedName}`);
                    }
                }
                testFiles.push(file);
            }
        }
        return { typeFiles, testFiles };
    });
}
/** In addition to dependencies found oun source code, also get dependencies from tsconfig. */
function calculateDependencies(packageName, directory, dependencies, oldMajorVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const tsconfig = yield fsp.readJSON(util_1.joinPaths(directory, "tsconfig.json"));
        const { paths } = tsconfig.compilerOptions;
        for (const key in paths) {
            if (key !== packageName && !dependencies.has(key)) {
                throw new Error(`In ${packageName}: path mapping for '${key}' is not used.`);
            }
        }
        if (oldMajorVersion !== undefined) {
            const selfPath = paths && paths[packageName];
            const version = selfPath === undefined ? undefined : parseDependencyVersionFromPath(packageName, packageName, selfPath);
            if (version !== oldMajorVersion) {
                console.log(version, oldMajorVersion);
                const correctPathMapping = `${packageName}/v${oldMajorVersion}`;
                throw new Error(`${packageName}: Must have a "paths" entry of "${packageName}": ${JSON.stringify([correctPathMapping])}`);
            }
        }
        return util_1.makeObject(dependencies, dependency => {
            const path = paths && paths[dependency];
            return path === undefined ? "*" : parseDependencyVersionFromPath(packageName, dependency, path);
        });
    });
}
// e.g. parseDependencyVersionFromPath("../../foo/v0", "foo") should return "0"
function parseDependencyVersionFromPath(packageName, dependencyName, dependencyPaths) {
    if (dependencyPaths.length !== 1) {
        throw new Error(`In ${packageName}: Path mapping for ${dependencyName} may only have 1 entry.`);
    }
    const dependencyPath = dependencyPaths[0];
    const versionString = withoutStart(dependencyPath, dependencyName + "/");
    const version = versionString === undefined ? undefined : parseMajorVersionFromDirectoryName(versionString);
    if (version === undefined) {
        throw new Error(`In ${packageName}, unexpected path mapping for ${dependencyName}: '${dependencyPath}'`);
    }
    return version;
}
function withoutStart(s, start) {
    if (s.startsWith(start)) {
        return s.slice(start.length);
    }
    return undefined;
}
function hash(directory, files) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileContents = yield util_1.mapAsyncOrdered(files, (f) => __awaiter(this, void 0, void 0, function* () { return f + "**" + (yield readFile(directory, f)); }));
        const allContent = fileContents.join("||");
        return util_1.computeHash(allContent);
    });
}
function readFile(directory, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const full = util_1.joinPaths(directory, fileName);
        const text = yield io_1.readFile(full);
        if (text.charCodeAt(0) === 0xFEFF) {
            const commands = [
                "npm install -g strip-bom-cli",
                `strip-bom ${fileName} > fix`,
                `mv fix ${fileName}`
            ];
            throw new Error(`File '${full}' has a BOM. Try using:\n${commands.join("\n")}`);
        }
        return text;
    });
}
exports.readFile = readFile;
function checkAllFilesUsed(directory, ls, usedFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        const unusedFilesName = "UNUSED_FILES.txt";
        if (ls.includes(unusedFilesName)) {
            const lsMinusUnusedFiles = new Set(ls);
            lsMinusUnusedFiles.delete(unusedFilesName);
            const unusedFiles = (yield fsp.readFile(util_1.joinPaths(directory, unusedFilesName), "utf-8")).split(/\r?\n/g);
            for (const unusedFile of unusedFiles) {
                if (!lsMinusUnusedFiles.delete(unusedFile)) {
                    throw new Error(`In ${directory}: file ${unusedFile} listed in ${unusedFilesName} does not exist.`);
                }
            }
            ls = Array.from(lsMinusUnusedFiles);
        }
        for (const lsEntry of ls) {
            if (usedFiles.has(lsEntry)) {
                continue;
            }
            const stat = yield fsp.stat(util_1.joinPaths(directory, lsEntry));
            if (stat.isDirectory()) {
                // We allow a "scripts" directory to be used for scripts.
                if (lsEntry === "node_modules" || lsEntry === "scripts") {
                    continue;
                }
                const subdir = util_1.joinPaths(directory, lsEntry);
                const lssubdir = yield fsp.readdir(subdir);
                if (lssubdir.length === 0) {
                    throw new Error(`Empty directory ${subdir} (${util_1.join(usedFiles)})`);
                }
                const usedInSubdir = util_1.mapDefined(usedFiles, u => withoutStart(u, lsEntry + "/"));
                yield checkAllFilesUsed(subdir, lssubdir, new Set(usedInSubdir));
            }
            else {
                if (lsEntry.toLowerCase() !== "readme.md" && lsEntry !== "NOTICE" && lsEntry !== ".editorconfig") {
                    throw new Error(`Directory ${directory} has unused file ${lsEntry}`);
                }
            }
        }
    });
}
//# sourceMappingURL=definition-parser.js.map