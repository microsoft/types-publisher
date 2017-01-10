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
const path = require("path");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const packages_1 = require("./packages");
const settings_1 = require("./settings");
/** Generates the package to disk */
function generateAnyPackage(pkg, packages, versions, options) {
    return pkg.isNotNeeded() ? generateNotNeededPackage(pkg, versions) : generatePackage(pkg, packages, versions, options);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = generateAnyPackage;
function generatePackage(typing, packages, versions, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        const outputPath = typing.outputDirectory;
        yield clearOutputPath(outputPath, log);
        log("Generate package.json, metadata.json, and README.md");
        const packageJson = yield createPackageJSON(typing, versions.getVersion(typing.id), packages, options);
        const metadataJson = createMetadataJSON(typing);
        const readme = createReadme(typing);
        log("Write metadata files to disk");
        const outputs = [
            writeOutputFile("package.json", packageJson),
            writeOutputFile("types-metadata.json", metadataJson),
            writeOutputFile("README.md", readme)
        ];
        outputs.push(...typing.files.map((file) => __awaiter(this, void 0, void 0, function* () {
            log(`Copy ${file}`);
            yield fsp.copy(typing.filePath(file, options), yield outputFilePath(file));
        })));
        yield Promise.all(outputs);
        return logResult();
        function writeOutputFile(filename, content) {
            return __awaiter(this, void 0, void 0, function* () {
                yield io_1.writeFile(yield outputFilePath(filename), content);
            });
        }
        function outputFilePath(filename) {
            return __awaiter(this, void 0, void 0, function* () {
                const full = util_1.joinPaths(outputPath, filename);
                const dir = path.dirname(full);
                if (dir !== outputPath) {
                    yield fsp.mkdirp(dir);
                }
                return full;
            });
        }
    });
}
function generateNotNeededPackage(pkg, versions) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        const outputPath = pkg.outputDirectory;
        yield clearOutputPath(outputPath, log);
        log("Generate package.json and README.md");
        const packageJson = createNotNeededPackageJSON(pkg, versions.getVersion(pkg.id));
        const readme = pkg.readme();
        log("Write metadata files to disk");
        yield writeOutputFile("package.json", packageJson);
        yield writeOutputFile("README.md", readme);
        // Not-needed packages never change version
        return logResult();
        function writeOutputFile(filename, content) {
            return io_1.writeFile(util_1.joinPaths(outputPath, filename), content);
        }
    });
}
function clearOutputPath(outputPath, log) {
    return __awaiter(this, void 0, void 0, function* () {
        log(`Create output path ${outputPath}`);
        yield fsp.mkdirp(outputPath);
        log(`Clear out old files`);
        yield fsp.emptyDir(outputPath);
    });
}
exports.clearOutputPath = clearOutputPath;
function createMetadataJSON(typing) {
    const replacer = (key, value) => key === "root" ? undefined : value;
    return JSON.stringify(typing, replacer, 4);
}
function createPackageJSON(typing, version, packages, options) {
    return __awaiter(this, void 0, void 0, function* () {
        // typing may provide a partial `package.json` for us to complete
        const pkgPath = typing.filePath("package.json", options);
        const pkg = typing.hasPackageJson ? yield io_1.readJson(pkgPath) : {};
        const dependencies = pkg.dependencies || {};
        const peerDependencies = pkg.peerDependencies || {};
        addInferredDependencies(dependencies, peerDependencies, typing, packages);
        const description = pkg.description || `TypeScript definitions for ${typing.libraryName}`;
        // Use the ordering of fields from https://docs.npmjs.com/files/package.json
        const out = {
            name: typing.fullNpmName,
            version: version.versionString,
            description,
            // keywords,
            // homepage,
            // bugs,
            license: "MIT",
            author: typing.authors,
            // contributors
            main: "",
            repository: {
                type: "git",
                url: `${typing.sourceRepoURL}.git`
            },
            scripts: {},
            dependencies,
            peerDependencies,
            typesPublisherContentHash: typing.contentHash,
            typeScriptVersion: typing.typeScriptVersion
        };
        return JSON.stringify(out, undefined, 4);
    });
}
/** Adds inferred dependencies to `dependencies`, if they are not already specified in either `dependencies` or `peerDependencies`. */
function addInferredDependencies(dependencies, peerDependencies, typing, allPackages) {
    for (const dependency of typing.dependencies) {
        const typesDependency = packages_1.fullNpmName(dependency.name);
        // A dependency "foo" is already handled if we already have a dependency/peerDependency on the package "foo" or "@types/foo".
        function handlesDependency(deps) {
            return util_1.hasOwnProperty(deps, dependency.name) || util_1.hasOwnProperty(deps, typesDependency);
        }
        if (!handlesDependency(dependencies) && !handlesDependency(peerDependencies) && allPackages.hasTypingFor(dependency)) {
            dependencies[typesDependency] = dependencySemver(dependency.majorVersion);
        }
    }
}
function dependencySemver(dependency) {
    return dependency === "*" ? dependency : `^${dependency}`;
}
function createNotNeededPackageJSON({ libraryName, name, fullNpmName, sourceRepoURL }, version) {
    return JSON.stringify({
        name: fullNpmName,
        version: version.versionString,
        typings: null,
        description: `Stub TypeScript definitions entry for ${libraryName}, which provides its own types definitions`,
        main: "",
        scripts: {},
        author: "",
        repository: sourceRepoURL,
        license: "MIT",
        // No `typings`, that's provided by the dependency.
        dependencies: {
            [name]: "*"
        }
    }, undefined, 4);
}
function createReadme(typing) {
    const lines = [];
    lines.push("# Installation");
    lines.push("> `npm install --save " + typing.fullNpmName + "`");
    lines.push("");
    lines.push("# Summary");
    if (typing.projectName) {
        lines.push(`This package contains type definitions for ${typing.libraryName} (${typing.projectName}).`);
    }
    else {
        lines.push(`This package contains type definitions for ${typing.libraryName}.`);
    }
    lines.push("");
    lines.push("# Details");
    lines.push(`Files were exported from ${typing.sourceRepoURL}/tree/${settings_1.sourceBranch}/${typing.subDirectoryPath}`);
    lines.push("");
    lines.push(`Additional Details`);
    lines.push(` * Last updated: ${(new Date()).toUTCString()}`);
    const dependencies = Array.from(typing.dependencies).map(d => d.name);
    lines.push(` * Dependencies: ${dependencies.length ? dependencies.join(", ") : "none"}`);
    lines.push(` * Global values: ${typing.globals.length ? typing.globals.join(", ") : "none"}`);
    lines.push("");
    if (typing.authors) {
        lines.push("# Credits");
        lines.push(`These definitions were written by ${typing.authors}.`);
        lines.push("");
    }
    return lines.join("\r\n");
}
//# sourceMappingURL=package-generator.js.map