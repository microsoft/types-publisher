"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const definitelytyped_header_parser_1 = require("definitelytyped-header-parser");
const util_1 = require("../util/util");
const module_info_1 = require("./module-info");
const packages_1 = require("./packages");
const settings_1 = require("./settings");
/** @param fs Rooted at the package's directory, e.g. `DefinitelyTyped/types/abs` */
async function getTypingInfo(packageName, fs) {
    if (packageName !== packageName.toLowerCase()) {
        throw new Error(`Package name \`${packageName}\` should be strictly lowercase`);
    }
    const [rootDirectoryLs, olderVersionDirectories] = util_1.split(await fs.readdir(), fileOrDirectoryName => {
        const majorVersion = parseMajorVersionFromDirectoryName(fileOrDirectoryName);
        return majorVersion === undefined ? undefined : { directoryName: fileOrDirectoryName, majorVersion };
    });
    const latestData = await combineDataForAllTypesVersions(packageName, rootDirectoryLs, fs, undefined);
    const latestVersion = latestData.libraryMajorVersion;
    const older = await util_1.mapAsyncOrdered(olderVersionDirectories, async ({ directoryName, majorVersion }) => {
        if (majorVersion === latestVersion) {
            throw new Error(`The latest major version is ${latestVersion}, but a directory v${latestVersion} exists.`);
        }
        const ls = await fs.readdir(directoryName);
        const data = await combineDataForAllTypesVersions(packageName, ls, fs.subDir(directoryName), majorVersion);
        if (data.libraryMajorVersion !== majorVersion) {
            throw new Error(`Directory ${directoryName} indicates major version ${majorVersion}, but header indicates major version ${data.libraryMajorVersion}`);
        }
        return data;
    });
    const res = {};
    res[latestVersion] = latestData;
    for (const o of older) {
        res[o.libraryMajorVersion] = o;
    }
    return res;
}
exports.getTypingInfo = getTypingInfo;
const packageJsonName = "package.json";
function getTypesVersionsAndPackageJson(ls) {
    const withoutPackageJson = ls.filter(name => name !== packageJsonName);
    const [remainingLs, typesVersions] = util_1.split(withoutPackageJson, fileOrDirectoryName => {
        const match = /^ts(\d+\.\d+)$/.exec(fileOrDirectoryName);
        if (match === null) {
            return undefined;
        }
        const version = match[1];
        if (!definitelytyped_header_parser_1.isTypeScriptVersion(version)) {
            throw new Error(`Directory name starting with 'ts' should be a valid TypeScript version. Got: ${version}`);
        }
        return version;
    });
    return { remainingLs, typesVersions, hasPackageJson: withoutPackageJson.length !== ls.length };
}
function parseMajorVersionFromDirectoryName(directoryName) {
    const match = /^v(\d+)$/.exec(directoryName);
    // tslint:disable-next-line no-null-keyword
    return match === null ? undefined : Number(match[1]);
}
exports.parseMajorVersionFromDirectoryName = parseMajorVersionFromDirectoryName;
async function combineDataForAllTypesVersions(typingsPackageName, ls, fs, oldMajorVersion) {
    const { remainingLs, typesVersions, hasPackageJson } = getTypesVersionsAndPackageJson(ls);
    // Every typesVersion has an index.d.ts, but only the root index.d.ts should have a header.
    const { contributors, libraryMajorVersion, libraryMinorVersion, typeScriptVersion: minTsVersion, libraryName, projects } = definitelytyped_header_parser_1.parseHeaderOrFail(await readFileAndThrowOnBOM("index.d.ts", fs));
    const dataForRoot = await getTypingDataForSingleTypesVersion(undefined, typingsPackageName, fs.debugPath(), remainingLs, fs, oldMajorVersion);
    const dataForOtherTypesVersions = await util_1.mapAsyncOrdered(typesVersions, async (tsVersion) => {
        const subFs = fs.subDir(`ts${tsVersion}`);
        return getTypingDataForSingleTypesVersion(tsVersion, typingsPackageName, fs.debugPath(), await subFs.readdir(), subFs, oldMajorVersion);
    });
    const allTypesVersions = [dataForRoot, ...dataForOtherTypesVersions];
    // tslint:disable-next-line await-promise (tslint bug)
    const packageJson = hasPackageJson ? await fs.readJson(packageJsonName) : {};
    const license = packages_1.getLicenseFromPackageJson(packageJson.license);
    const packageJsonDependencies = checkPackageJsonDependencies(packageJson.dependencies, packageJsonName);
    const files = Array.from(util_1.flatMap(allTypesVersions, ({ typescriptVersion, declFiles }) => declFiles.map(file => typescriptVersion === undefined ? file : `ts${typescriptVersion}/${file}`)));
    return {
        libraryName,
        typingsPackageName,
        projectName: projects[0],
        contributors,
        libraryMajorVersion,
        libraryMinorVersion,
        minTsVersion,
        typesVersions,
        files,
        license,
        // TODO: Explicit type arguments shouldn't be necessary. https://github.com/Microsoft/TypeScript/issues/27507
        dependencies: getAllUniqueValues(allTypesVersions, "dependencies"),
        testDependencies: getAllUniqueValues(allTypesVersions, "testDependencies"),
        pathMappings: getAllUniqueValues(allTypesVersions, "pathMappings"),
        packageJsonDependencies,
        contentHash: await hash(hasPackageJson ? [...files, packageJsonName] : files, util_1.mapDefined(allTypesVersions, a => a.tsconfigPathsForHash), fs),
        globals: getAllUniqueValues(allTypesVersions, "globals"),
        declaredModules: getAllUniqueValues(allTypesVersions, "declaredModules"),
    };
}
function getAllUniqueValues(records, key) {
    return util_1.unique(util_1.flatMap(records, x => x[key]));
}
/**
 * @param typescriptVersion Set if this is in e.g. a `ts3.1` directory.
 * @param packageName Name of the outermost directory; e.g. for "node/v4" this is just "node".
 * @param ls All file/directory names in `directory`.
 * @param fs FS rooted at the directory for this particular TS version, e.g. `types/abs/ts3.1` or `types/abs` when typescriptVersion is undefined.
 */
async function getTypingDataForSingleTypesVersion(typescriptVersion, packageName, packageDirectory, ls, fs, oldMajorVersion) {
    const tsconfig = await fs.readJson("tsconfig.json"); // tslint:disable-line await-promise (tslint bug)
    const { typeFiles, testFiles } = await entryFilesFromTsConfig(packageName, tsconfig, fs.debugPath());
    const { dependencies: dependenciesWithDeclaredModules, globals, declaredModules, declFiles } = await module_info_1.default(packageName, packageDirectory, typeFiles, fs);
    const declaredModulesSet = new Set(declaredModules);
    // Don't count an import of "x" as a dependency if we saw `declare module "x"` somewhere.
    const removeDeclaredModules = (modules) => util_1.filter(modules, m => !declaredModulesSet.has(m));
    const dependenciesSet = new Set(removeDeclaredModules(dependenciesWithDeclaredModules));
    const testDependencies = Array.from(removeDeclaredModules(await module_info_1.getTestDependencies(packageName, testFiles, dependenciesSet, fs)));
    const { dependencies, pathMappings } = await calculateDependencies(packageName, tsconfig, dependenciesSet, oldMajorVersion);
    const allUsedFiles = new Set(declFiles.concat(testFiles, ["tsconfig.json", "tslint.json"]));
    await checkAllFilesUsed(ls, allUsedFiles, fs);
    // Double-check that no windows "\\" broke in.
    for (const fileName of allUsedFiles) {
        if (util_1.hasWindowsSlashes(fileName)) {
            throw new Error(`In ${packageName}: windows slash detected in ${fileName}`);
        }
    }
    const tsconfigPathsForHash = JSON.stringify(tsconfig.compilerOptions.paths);
    return { typescriptVersion, dependencies, testDependencies, pathMappings, globals, declaredModules, declFiles, tsconfigPathsForHash };
}
function checkPackageJsonDependencies(dependencies, path) {
    if (dependencies === undefined) { // tslint:disable-line strict-type-predicates (false positive)
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
async function entryFilesFromTsConfig(packageName, tsconfig, directoryPath) {
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
}
async function calculateDependencies(packageName, tsconfig, dependencyNames, oldMajorVersion) {
    const paths = tsconfig.compilerOptions && tsconfig.compilerOptions.paths || {};
    const dependencies = [];
    const pathMappings = [];
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
        // Path mapping may be for "@foo/bar" -> "foo__bar".
        const scopedPackageName = util_1.unmangleScopedPackage(pathMapping);
        if (scopedPackageName !== undefined) {
            if (dependencyName !== scopedPackageName) {
                throw new Error(`Expected directory ${pathMapping} to be the path mapping for ${dependencyName}`);
            }
            continue;
        }
        const majorVersion = parseDependencyVersionFromPath(dependencyName, dependencyName, pathMapping);
        if (dependencyName === packageName) {
            if (oldMajorVersion === undefined) {
                throw new Error(`In ${packageName}: Latest version of a package should not have a path mapping for itself.`);
            }
            else if (majorVersion !== oldMajorVersion) {
                const correctPathMapping = [`${dependencyName}/v${oldMajorVersion}`];
                throw new Error(`In ${packageName}: Must have a "paths" entry of "${dependencyName}": ${JSON.stringify(correctPathMapping)}`);
            }
        }
        else {
            if (dependencyNames.has(dependencyName)) {
                dependencies.push({ name: dependencyName, majorVersion });
            }
        }
        // Else, the path mapping may be necessary if it is for a dependency-of-a-dependency. We will check this in check-parse-results.
        pathMappings.push({ packageName: dependencyName, majorVersion });
    }
    if (oldMajorVersion !== undefined && !(paths && packageName in paths)) {
        throw new Error(`${packageName}: Older version ${oldMajorVersion} must have a path mapping for itself.`);
    }
    for (const dependency of dependencyNames) {
        if (!dependencies.some(d => d.name === dependency) && !nodeBuiltins.has(dependency)) {
            dependencies.push({ name: dependency, majorVersion: "*" });
        }
    }
    return { dependencies, pathMappings };
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
async function hash(files, tsconfigPathsForHash, fs) {
    const fileContents = await util_1.mapAsyncOrdered(files, async (f) => `${f}**${await readFileAndThrowOnBOM(f, fs)}`);
    let allContent = fileContents.join("||");
    for (const path of tsconfigPathsForHash) {
        allContent += path;
    }
    return util_1.computeHash(allContent);
}
async function readFileAndThrowOnBOM(fileName, fs) {
    const text = await fs.readFile(fileName);
    if (text.charCodeAt(0) === 0xFEFF) {
        const commands = [
            "npm install -g strip-bom-cli",
            `strip-bom ${fileName} > fix`,
            `mv fix ${fileName}`,
        ];
        throw new Error(`File '${fileName}' has a BOM. Try using:\n${commands.join("\n")}`);
    }
    return text;
}
exports.readFileAndThrowOnBOM = readFileAndThrowOnBOM;
const unusedFilesName = "UNUSED_FILES.txt";
async function checkAllFilesUsed(ls, usedFiles, fs) {
    const lsSet = new Set(ls);
    const unusedFiles = lsSet.delete(unusedFilesName)
        ? new Set((await fs.readFile(unusedFilesName)).split(/\r?\n/g))
        : new Set();
    await checkAllUsedRecur(lsSet, usedFiles, unusedFiles, fs);
}
async function checkAllUsedRecur(ls, usedFiles, unusedFiles, fs) {
    for (const lsEntry of ls) {
        if (usedFiles.has(lsEntry)) {
            continue;
        }
        if (unusedFiles.has(lsEntry)) {
            unusedFiles.delete(lsEntry);
            continue;
        }
        if (await fs.isDirectory(lsEntry)) {
            const subdir = fs.subDir(lsEntry);
            // We allow a "scripts" directory to be used for scripts.
            if (lsEntry === "node_modules" || lsEntry === "scripts") {
                continue;
            }
            const lssubdir = await subdir.readdir();
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
            await checkAllUsedRecur(lssubdir, takeSubdirectoryOutOfSet(usedFiles), takeSubdirectoryOutOfSet(unusedFiles), subdir);
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
}
//# sourceMappingURL=definition-parser.js.map