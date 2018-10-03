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
const definitelytyped_header_parser_1 = require("definitelytyped-header-parser");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const module_info_1 = require("./module-info");
const packages_1 = require("./packages");
const settings_1 = require("./settings");
/** @param fs Rooted at the package's directory, e.g. `DefinitelyTyped/types/abs` */
function getTypingInfo(packageName, fs) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packageName !== packageName.toLowerCase()) {
            throw new Error(`Package name \`${packageName}\` should be strictly lowercase`);
        }
        const { rootDirectoryLs, olderVersionDirectories } = yield getOlderVersions(fs);
        const { data: latestData, logs: latestLogs } = yield getTypingData(packageName, rootDirectoryLs, fs);
        const latestVersion = latestData.libraryMajorVersion;
        const [log, logResult] = logging_1.quietLogger();
        logging_1.moveLogs(log, latestLogs);
        const older = yield util_1.mapAsyncOrdered(olderVersionDirectories, ({ directoryName, majorVersion }) => __awaiter(this, void 0, void 0, function* () {
            if (majorVersion === latestVersion) {
                throw new Error(`The latest major version is ${latestVersion}, but a directory v${latestVersion} exists.`);
            }
            const ls = yield fs.readdir(directoryName);
            const { data, logs } = yield getTypingData(packageName, ls, fs.subDir(directoryName), majorVersion);
            log(`Parsing older version ${majorVersion}`);
            logging_1.moveLogs(log, logs, msg => `    ${msg}`);
            if (data.libraryMajorVersion !== majorVersion) {
                throw new Error(`Directory ${directoryName} indicates major version ${majorVersion}, but header indicates major version ${data.libraryMajorVersion}`);
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
function getOlderVersions(fs) {
    return __awaiter(this, void 0, void 0, function* () {
        const lsRootDirectory = yield fs.readdir();
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
    // tslint:disable-next-line no-null-keyword
    return match === null ? undefined : Number(match[1]);
}
exports.parseMajorVersionFromDirectoryName = parseMajorVersionFromDirectoryName;
/**
 * @param packageName Name of the outermost directory; e.g. for "node/v4" this is just "node".
 * @param directory Full path to the directory for this package; e.g. "../DefinitelyTyped/foo/v3".
 * @param ls All file/directory names in `directory`.
 */
function getTypingData(packageName, ls, fs, oldMajorVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        log(`Reading contents of ${packageName}`);
        // There is a *single* main file, containing metadata comments.
        // But there may be many entryFilenames, which are the starting points of inferring all files to be included.
        const mainFilename = "index.d.ts";
        const { contributors, libraryMajorVersion, libraryMinorVersion, typeScriptVersion, libraryName, projects } = definitelytyped_header_parser_1.parseHeaderOrFail(yield readFileAndThrowOnBOM(mainFilename, fs));
        const tsconfig = yield fs.readJson("tsconfig.json"); // tslint:disable-line await-promise (tslint bug)
        const { typeFiles, testFiles } = yield entryFilesFromTsConfig(packageName, tsconfig, fs.debugPath());
        const { dependencies: dependenciesWithDeclaredModules, globals, declaredModules, declFiles } = yield module_info_1.default(packageName, typeFiles, fs);
        const declaredModulesSet = new Set(declaredModules);
        // Don't count an import of "x" as a dependency if we saw `declare module "x"` somewhere.
        const removeDeclaredModules = (modules) => util_1.filter(modules, m => !declaredModulesSet.has(m));
        const dependenciesSet = new Set(removeDeclaredModules(dependenciesWithDeclaredModules));
        const testDependencies = Array.from(removeDeclaredModules(yield module_info_1.getTestDependencies(packageName, testFiles, dependenciesSet, fs)));
        const { dependencies, pathMappings } = yield calculateDependencies(packageName, tsconfig, dependenciesSet, oldMajorVersion);
        const packageJsonPath = "package.json";
        const hasPackageJson = (yield fs.readdir()).includes(packageJsonPath);
        // tslint:disable-next-line await-promise (tslint bug)
        const packageJson = hasPackageJson ? yield fs.readJson(packageJsonPath) : {};
        const license = packages_1.getLicenseFromPackageJson(packageJson.license);
        const packageJsonDependencies = checkPackageJsonDependencies(packageJson.dependencies, packageJsonPath);
        const allContentHashFiles = hasPackageJson ? declFiles.concat(["package.json"]) : declFiles;
        const allFiles = new Set(allContentHashFiles.concat(testFiles, ["tsconfig.json", "tslint.json"]));
        yield checkAllFilesUsed(ls, allFiles, fs);
        // Double-check that no windows "\\" broke in.
        for (const fileName of allContentHashFiles) {
            if (util_1.hasWindowsSlashes(fileName)) {
                throw new Error(`In ${packageName}: windows slash detected in ${fileName}`);
            }
        }
        const sourceRepoURL = "https://github.com/DefinitelyTyped/DefinitelyTyped";
        const data = {
            contributors,
            dependencies,
            testDependencies,
            pathMappings,
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
            testFiles,
            license,
            packageJsonDependencies,
            contentHash: yield hash(allContentHashFiles, tsconfig.compilerOptions.paths, fs)
        };
        return { data, logs: logResult() };
    });
}
function checkPackageJsonDependencies(dependencies, path) {
    if (dependencies === undefined) {
        return [];
    }
    if (dependencies === null || typeof dependencies !== "object") { // tslint:disable-line strict-type-predicates
        throw new Error(`${path} should contain "dependencies" or not exist.`);
    }
    const deps = [];
    for (const dependencyName in dependencies) {
        if (!settings_1.dependenciesWhitelist.has(dependencyName)) {
            const msg = dependencyName.startsWith("@types/")
                ? "Don't use a 'package.json' for @types dependencies."
                : `Dependency ${dependencyName} not in whitelist.
If you are depending on another \`@types\` package, do *not* add it to a \`package.json\`. Path mapping should make the import work.
If this is an external library that provides typings,  please make a pull request to types-publisher adding it to \`dependenciesWhitelist.txt\`.`;
            throw new Error(`In ${path}: ${msg}`);
        }
        const version = dependencies[dependencyName];
        if (typeof version !== "string") { // tslint:disable-line strict-type-predicates
            throw new Error(`In ${path}: Dependency version for ${dependencyName} should be a string.`);
        }
        deps.push({ name: dependencyName, version });
    }
    return deps;
}
function entryFilesFromTsConfig(packageName, tsconfig, directoryPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const tsconfigPath = `${directoryPath}/tsconfig.json`;
        if (tsconfig.include) {
            throw new Error(`In tsconfig, don't use "include", must use "files"`);
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
                    if (file !== expectedName && file !== `${expectedName}x`) {
                        const message = file.endsWith(".ts") || file.endsWith(".tsx")
                            ? `Expected file '${file}' to be named ${expectedName}`
                            : `Unexpected file extension for '${file}' -- expected '.ts' or '.tsx' (maybe this should not be in "files")`;
                        throw new Error(message);
                    }
                }
                testFiles.push(file);
            }
        }
        return { typeFiles, testFiles };
    });
}
/** In addition to dependencies found oun source code, also get dependencies from tsconfig. */
function calculateDependencies(packageName, tsconfig, dependencyNames, oldMajorVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const paths = tsconfig.compilerOptions && tsconfig.compilerOptions.paths || {};
        const dependencies = {};
        const pathMappings = {};
        for (const dependencyName in paths) {
            // Might have a path mapping for "foo/*" to support subdirectories
            const rootDirectory = withoutEnd(dependencyName, "/*");
            if (rootDirectory !== undefined) {
                if (!(rootDirectory in paths)) {
                    throw new Error(`In ${packageName}: found path mapping for ${dependencyName} but not for ${rootDirectory}`);
                }
                continue;
            }
            const pathMappingList = paths[dependencyName];
            if (pathMappingList.length !== 1) {
                throw new Error(`In ${packageName}: Path mapping for ${dependencyName} may only have 1 entry.`);
            }
            const pathMapping = pathMappingList[0];
            // Path mapping may be for "@foo/bar" -> "foo__bar". Based on `getPackageNameFromAtTypesDirectory` in TypeScript.
            const mangledScopedPackageSeparator = "__";
            if (pathMapping.indexOf(mangledScopedPackageSeparator) !== -1) {
                const expected = `@${pathMapping.replace(mangledScopedPackageSeparator, "/")}`;
                if (dependencyName !== expected) {
                    throw new Error(`Expected directory ${pathMapping} to be the path mapping for ${dependencyName}`);
                }
                continue;
            }
            const version = parseDependencyVersionFromPath(dependencyName, dependencyName, pathMapping);
            if (dependencyName === packageName) {
                if (oldMajorVersion === undefined) {
                    throw new Error(`In ${packageName}: Latest version of a package should not have a path mapping for itself.`);
                }
                else if (version !== oldMajorVersion) {
                    const correctPathMapping = [`${dependencyName}/v${oldMajorVersion}`];
                    throw new Error(`In ${packageName}: Must have a "paths" entry of "${dependencyName}": ${JSON.stringify(correctPathMapping)}`);
                }
            }
            else {
                if (dependencyNames.has(dependencyName)) {
                    dependencies[dependencyName] = version;
                }
            }
            // Else, the path mapping may be necessary if it is for a dependency-of-a-dependency. We will check this in check-parse-results.
            pathMappings[dependencyName] = version;
        }
        if (oldMajorVersion !== undefined && !(paths && packageName in paths)) {
            throw new Error(`${packageName}: Older version ${oldMajorVersion} must have a path mapping for itself.`);
        }
        for (const dependency of dependencyNames) {
            if (!(dependency in dependencies) && !nodeBuiltins.has(dependency)) {
                dependencies[dependency] = "*";
            }
        }
        return { dependencies, pathMappings };
    });
}
const nodeBuiltins = new Set([
    "assert", "async_hooks", "buffer", "child_process", "cluster", "console", "constants", "crypto",
    "dgram", "dns", "domain", "events", "fs", "http", "http2", "https", "module", "net", "os",
    "path", "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "stream",
    "string_decoder", "timers", "tls", "tty", "url", "util", "v8", "vm", "zlib",
]);
// e.g. parseDependencyVersionFromPath("../../foo/v0", "foo") should return "0"
function parseDependencyVersionFromPath(packageName, dependencyName, dependencyPath) {
    const versionString = util_1.withoutStart(dependencyPath, `${dependencyName}/`);
    const version = versionString === undefined ? undefined : parseMajorVersionFromDirectoryName(versionString);
    if (version === undefined) {
        throw new Error(`In ${packageName}, unexpected path mapping for ${dependencyName}: '${dependencyPath}'`);
    }
    return version;
}
function withoutEnd(s, end) {
    if (s.endsWith(end)) {
        return s.slice(0, s.length - end.length);
    }
    return undefined;
}
function hash(files, tsconfigPaths, fs) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileContents = yield util_1.mapAsyncOrdered(files, (f) => __awaiter(this, void 0, void 0, function* () { return `${f}**${yield readFileAndThrowOnBOM(f, fs)}`; }));
        let allContent = fileContents.join("||");
        if (tsconfigPaths) {
            allContent += JSON.stringify(tsconfigPaths);
        }
        return util_1.computeHash(allContent);
    });
}
function readFileAndThrowOnBOM(fileName, fs) {
    return __awaiter(this, void 0, void 0, function* () {
        const text = yield fs.readFile(fileName);
        if (text.charCodeAt(0) === 0xFEFF) {
            const commands = [
                "npm install -g strip-bom-cli",
                `strip-bom ${fileName} > fix`,
                `mv fix ${fileName}`
            ];
            throw new Error(`File '${fileName}' has a BOM. Try using:\n${commands.join("\n")}`);
        }
        return text;
    });
}
exports.readFileAndThrowOnBOM = readFileAndThrowOnBOM;
const unusedFilesName = "UNUSED_FILES.txt";
function checkAllFilesUsed(ls, usedFiles, fs) {
    return __awaiter(this, void 0, void 0, function* () {
        const lsSet = new Set(ls);
        const unusedFiles = lsSet.delete(unusedFilesName)
            ? new Set((yield fs.readFile(unusedFilesName)).split(/\r?\n/g))
            : new Set();
        yield checkAllUsedRecur(lsSet, usedFiles, unusedFiles, fs);
    });
}
function checkAllUsedRecur(ls, usedFiles, unusedFiles, fs) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const lsEntry of ls) {
            if (usedFiles.has(lsEntry)) {
                continue;
            }
            if (unusedFiles.has(lsEntry)) {
                unusedFiles.delete(lsEntry);
                continue;
            }
            if (yield fs.isDirectory(lsEntry)) {
                const subdir = fs.subDir(lsEntry);
                // We allow a "scripts" directory to be used for scripts.
                if (lsEntry === "node_modules" || lsEntry === "scripts") {
                    continue;
                }
                const lssubdir = yield subdir.readdir();
                if (lssubdir.length === 0) {
                    throw new Error(`Empty directory ${subdir} (${util_1.join(usedFiles)})`);
                }
                function takeSubdirectoryOutOfSet(originalSet) {
                    const subdirSet = new Set();
                    for (const file of originalSet) {
                        const sub = util_1.withoutStart(file, `${lsEntry}/`);
                        if (sub !== undefined) {
                            originalSet.delete(file);
                            subdirSet.add(sub);
                        }
                    }
                    return subdirSet;
                }
                yield checkAllUsedRecur(lssubdir, takeSubdirectoryOutOfSet(usedFiles), takeSubdirectoryOutOfSet(unusedFiles), subdir);
            }
            else {
                if (lsEntry.toLowerCase() !== "readme.md" && lsEntry !== "NOTICE" && lsEntry !== ".editorconfig") {
                    throw new Error(`Unused file ${fs.debugPath()}/${lsEntry}`);
                }
            }
        }
        for (const unusedFile of unusedFiles) {
            throw new Error(`File ${fs.debugPath()}/${unusedFile} listed in ${unusedFilesName} does not exist.`);
        }
    });
}
//# sourceMappingURL=definition-parser.js.map