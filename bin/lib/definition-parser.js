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
const fs_extra_1 = require("fs-extra");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const module_info_1 = require("./module-info");
const packages_1 = require("./packages");
const dependenciesWhitelist = new Set(fs_extra_1.readFileSync(util_1.joinPaths(__dirname, "..", "..", "dependenciesWhitelist.txt"), "utf-8").split(/\r?\n/));
function getTypingInfo(packageName, typesPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packageName !== packageName.toLowerCase()) {
            throw new Error(`Package name \`${packageName}\` should be strictly lowercase`);
        }
        const rootDirectory = util_1.joinPaths(typesPath, packageName);
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
            const files = yield fs_extra_1.readdir(directory);
            const { data, logs } = yield getTypingData(packageName, directory, files, majorVersion);
            log(`Parsing older version ${majorVersion}`);
            logging_1.moveLogs(log, logs, msg => `    ${msg}`);
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
        const lsRootDirectory = yield fs_extra_1.readdir(rootDirectory);
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
function getTypingData(packageName, directory, ls, oldMajorVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        log(`Reading contents of ${directory}`);
        // There is a *single* main file, containing metadata comments.
        // But there may be many entryFilenames, which are the starting points of inferring all files to be included.
        const mainFilename = "index.d.ts";
        const { contributors, libraryMajorVersion, libraryMinorVersion, typeScriptVersion, libraryName, projects } = definitelytyped_header_parser_1.parseHeaderOrFail(yield readFileAndThrowOnBOM(directory, mainFilename));
        const tsconfig = yield fs_extra_1.readJSON(util_1.joinPaths(directory, "tsconfig.json"));
        const { typeFiles, testFiles } = yield entryFilesFromTsConfig(packageName, directory, tsconfig);
        const { dependencies: dependenciesWithDeclaredModules, globals, declaredModules, declFiles } = yield module_info_1.default(packageName, directory, typeFiles);
        const declaredModulesSet = new Set(declaredModules);
        // Don't count an import of "x" as a dependency if we saw `declare module "x"` somewhere.
        const removeDeclaredModules = (modules) => util_1.filter(modules, m => !declaredModulesSet.has(m));
        const dependenciesSet = new Set(removeDeclaredModules(dependenciesWithDeclaredModules));
        const testDependencies = Array.from(removeDeclaredModules(yield module_info_1.getTestDependencies(packageName, directory, testFiles, dependenciesSet)));
        const { dependencies, pathMappings } = yield calculateDependencies(packageName, tsconfig, dependenciesSet, oldMajorVersion);
        const packageJsonPath = util_1.joinPaths(directory, "package.json");
        const hasPackageJson = yield fs_extra_1.pathExists(packageJsonPath);
        const packageJson = hasPackageJson ? yield io_1.readJson(packageJsonPath) : {};
        const license = packages_1.getLicenseFromPackageJson(packageJson.license);
        const packageJsonDependencies = checkPackageJsonDependencies(packageJson.dependencies, packageJsonPath);
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
            contentHash: yield hash(directory, allContentHashFiles, tsconfig.compilerOptions.paths)
        };
        return { data, logs: logResult() };
    });
}
function checkPackageJsonDependencies(dependencies, path) {
    if (dependencies === undefined) {
        return [];
    }
    if (dependencies === null || typeof dependencies !== "object") {
        throw new Error(`${path} should contain "dependencies" or not exist.`);
    }
    const deps = [];
    for (const dependencyName in dependencies) {
        if (!dependenciesWhitelist.has(dependencyName)) {
            const msg = dependencyName.startsWith("@types/")
                ? "Don't use a 'package.json' for @types dependencies."
                : `Dependency ${dependencyName} not in whitelist.
If you are depending on another \`@types\` package, do *not* add it to a \`package.json\`. Path mapping should make the import work.
If this is an external library that provides typings,  please make a pull request to types-publisher adding it to \`dependenciesWhitelist.txt\`.`;
            throw new Error(`In ${path}: ${msg}`);
        }
        const version = dependencies[dependencyName];
        if (typeof version !== "string") {
            throw new Error(`In ${path}: Dependency version for ${dependencyName} should be a string.`);
        }
        deps.push({ name: dependencyName, version });
    }
    return deps;
}
function entryFilesFromTsConfig(packageName, directory, tsconfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const tsconfigPath = util_1.joinPaths(directory, "tsconfig.json");
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
                    if (file !== expectedName && file !== `${expectedName}x`) {
                        const message = file.endsWith(".ts") || file.endsWith(".tsx")
                            ? `Expected file '${file}' to be named ${expectedName}`
                            : `Unexpected file extension for '${file}' -- expected '.ts' or '.tsx' (maybe this should not be in "files")`;
                        throw new Error(`In ${directory}: ${message}`);
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
            if (!(dependency in dependencies)) {
                dependencies[dependency] = "*";
            }
        }
        return { dependencies, pathMappings };
    });
}
// e.g. parseDependencyVersionFromPath("../../foo/v0", "foo") should return "0"
function parseDependencyVersionFromPath(packageName, dependencyName, dependencyPath) {
    const versionString = withoutStart(dependencyPath, `${dependencyName}/`);
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
function withoutEnd(s, end) {
    if (s.endsWith(end)) {
        return s.slice(0, s.length - end.length);
    }
    return undefined;
}
function hash(directory, files, tsconfigPaths) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileContents = yield util_1.mapAsyncOrdered(files, (f) => __awaiter(this, void 0, void 0, function* () { return `${f}**${yield readFileAndThrowOnBOM(directory, f)}`; }));
        let allContent = fileContents.join("||");
        if (tsconfigPaths) {
            allContent += JSON.stringify(tsconfigPaths);
        }
        return util_1.computeHash(allContent);
    });
}
function readFileAndThrowOnBOM(directory, fileName) {
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
exports.readFileAndThrowOnBOM = readFileAndThrowOnBOM;
const unusedFilesName = "UNUSED_FILES.txt";
function checkAllFilesUsed(directory, ls, usedFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        const lsSet = new Set(ls);
        const unusedFiles = lsSet.delete(unusedFilesName)
            ? new Set((yield io_1.readFile(util_1.joinPaths(directory, unusedFilesName))).split(/\r?\n/g))
            : new Set();
        yield checkAllUsedRecur(directory, lsSet, usedFiles, unusedFiles);
    });
}
function checkAllUsedRecur(directory, ls, usedFiles, unusedFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const lsEntry of ls) {
            if (usedFiles.has(lsEntry)) {
                continue;
            }
            if (unusedFiles.has(lsEntry)) {
                unusedFiles.delete(lsEntry);
                continue;
            }
            if (yield io_1.isDirectory(util_1.joinPaths(directory, lsEntry))) {
                // We allow a "scripts" directory to be used for scripts.
                if (lsEntry === "node_modules" || lsEntry === "scripts") {
                    continue;
                }
                const subdir = util_1.joinPaths(directory, lsEntry);
                const lssubdir = yield fs_extra_1.readdir(subdir);
                if (lssubdir.length === 0) {
                    throw new Error(`Empty directory ${subdir} (${util_1.join(usedFiles)})`);
                }
                function takeSubdirectoryOutOfSet(originalSet) {
                    const subdirSet = new Set();
                    for (const file of originalSet) {
                        const sub = withoutStart(file, `${lsEntry}/`);
                        if (sub !== undefined) {
                            originalSet.delete(file);
                            subdirSet.add(sub);
                        }
                    }
                    return subdirSet;
                }
                yield checkAllUsedRecur(subdir, lssubdir, takeSubdirectoryOutOfSet(usedFiles), takeSubdirectoryOutOfSet(unusedFiles));
            }
            else {
                if (lsEntry.toLowerCase() !== "readme.md" && lsEntry !== "NOTICE" && lsEntry !== ".editorconfig") {
                    throw new Error(`Directory ${directory} has unused file ${lsEntry}`);
                }
            }
        }
        for (const unusedFile of unusedFiles) {
            throw new Error(`In ${directory}: file ${unusedFile} listed in ${unusedFilesName} does not exist.`);
        }
    });
}
//# sourceMappingURL=definition-parser.js.map