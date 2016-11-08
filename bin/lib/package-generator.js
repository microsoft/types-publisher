"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fsp = require("fs-promise");
const path = require("path");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const common_1 = require("./common");
const versions_1 = require("./versions");
/** Generates the package to disk */
function generateAnyPackage(pkg, availableTypes, versions) {
    return pkg.packageKind === "not-needed" ? generateNotNeededPackage(pkg, versions) : generatePackage(pkg, availableTypes, versions);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = generateAnyPackage;
function generatePackage(typing, availableTypes, versions) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        const outputPath = common_1.getOutputPath(typing);
        yield clearOutputPath(outputPath, log);
        log("Generate package.json, metadata.json, and README.md");
        const packageJson = yield createPackageJSON(typing, versions.versionInfo(typing), availableTypes);
        const metadataJson = createMetadataJSON(typing);
        const readme = createReadme(typing);
        log("Write metadata files to disk");
        const outputs = [
            writeOutputFile("package.json", packageJson),
            writeOutputFile("types-metadata.json", metadataJson),
            writeOutputFile("README.md", readme)
        ];
        outputs.push(...typing.files.map((file) => __awaiter(this, void 0, void 0, function* () {
            log(`Copy and patch ${file}`);
            let content = yield io_1.readFile(filePath(typing, file));
            content = patchDefinitionFile(content);
            return writeOutputFile(file, content);
        })));
        yield Promise.all(outputs);
        return logResult();
        function writeOutputFile(filename, content) {
            return __awaiter(this, void 0, void 0, function* () {
                const full = path.join(outputPath, filename);
                const dir = path.dirname(full);
                if (dir !== outputPath) {
                    yield fsp.mkdirp(dir);
                }
                return yield io_1.writeFile(full, content);
            });
        }
    });
}
function generateNotNeededPackage(pkg, versions) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        const outputPath = common_1.getOutputPath(pkg);
        yield clearOutputPath(outputPath, log);
        log("Generate package.json and README.md");
        const packageJson = createNotNeededPackageJSON(pkg, versions.versionInfo(pkg).version);
        const readme = common_1.notNeededReadme(pkg);
        log("Write metadata files to disk");
        yield writeOutputFile("package.json", packageJson);
        yield writeOutputFile("README.md", readme);
        // Not-needed packages never change version
        return logResult();
        function writeOutputFile(filename, content) {
            return io_1.writeFile(path.join(outputPath, filename), content);
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
function patchDefinitionFile(input) {
    const pathToLibrary = /\/\/\/ <reference path="..\/(\w.+)\/.+"/gm;
    let output = input.replace(pathToLibrary, '/// <reference types="$1"');
    return output;
}
function createMetadataJSON(typing) {
    const replacer = (key, value) => key === "root" ? undefined : value;
    return JSON.stringify(typing, replacer, 4);
}
function filePath(typing, fileName) {
    return path.join(typing.root, fileName);
}
function createPackageJSON(typing, { version, contentHash }, availableTypes) {
    return __awaiter(this, void 0, void 0, function* () {
        // typing may provide a partial `package.json` for us to complete
        const pkgPath = filePath(typing, "package.json");
        let pkg = typing.hasPackageJson ? yield io_1.readJson(pkgPath) : {};
        const ignoredField = Object.keys(pkg).find(field => !["dependencies", "peerDependencies", "description"].includes(field));
        // Kludge: ignore "scripts" (See https://github.com/DefinitelyTyped/definition-tester/issues/35)
        if (ignoredField && ignoredField !== "scripts") {
            throw new Error(`Ignored field in ${pkgPath}: ${ignoredField}`);
        }
        const dependencies = pkg.dependencies || {};
        const peerDependencies = pkg.peerDependencies || {};
        addInferredDependencies(dependencies, peerDependencies, typing, availableTypes);
        const description = pkg.description || `TypeScript definitions for ${typing.libraryName}`;
        // Use the ordering of fields from https://docs.npmjs.com/files/package.json
        const out = {
            name: common_1.fullPackageName(typing.typingsPackageName),
            version: versions_1.versionString(version),
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
            typings: typing.definitionFilename,
            typesPublisherContentHash: contentHash
        };
        return JSON.stringify(out, undefined, 4);
    });
}
/** Adds inferred dependencies to `dependencies`, if they are not already specified in either `dependencies` or `peerDependencies`. */
function addInferredDependencies(dependencies, peerDependencies, typing, availableTypes) {
    function addDependency(dependency) {
        const typesDependency = common_1.fullPackageName(dependency);
        // A dependency "foo" is already handled if we already have a dependency/peerDependency on the package "foo" or "@types/foo".
        function handlesDependency(deps) {
            return util_1.hasOwnProperty(deps, dependency) || util_1.hasOwnProperty(deps, typesDependency);
        }
        if (!handlesDependency(dependencies) && !handlesDependency(peerDependencies) && util_1.hasOwnProperty(availableTypes, dependency)) {
            // 1st/2nd case: Don't add a dependency if it was specified in the package.json or if it has already been added.
            // 3rd case: If it's not a package we know of, just ignore it.
            // For example, we may have an import of "http", where the package is depending on "node" to provide that.
            dependencies[typesDependency] = "*";
        }
    }
    typing.moduleDependencies.forEach(addDependency);
    typing.libraryDependencies.forEach(addDependency);
}
function createNotNeededPackageJSON({ libraryName, typingsPackageName, sourceRepoURL }, version) {
    return JSON.stringify({
        name: common_1.fullPackageName(typingsPackageName),
        version: versions_1.versionString(version),
        typings: null,
        description: `Stub TypeScript definitions entry for ${libraryName}, which provides its own types definitions`,
        main: "",
        scripts: {},
        author: "",
        repository: sourceRepoURL,
        license: "MIT",
        // No `typings`, that's provided by the dependency.
        dependencies: {
            [typingsPackageName]: "*"
        }
    }, undefined, 4);
}
function createReadme(typing) {
    const lines = [];
    lines.push("# Installation");
    lines.push("> `npm install --save " + common_1.fullPackageName(typing.typingsPackageName) + "`");
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
    lines.push(`Files were exported from ${typing.sourceRepoURL}/tree/${typing.sourceBranch}/${typing.typingsPackageName}`);
    lines.push("");
    lines.push(`Additional Details`);
    lines.push(` * Last updated: ${(new Date()).toUTCString()}`);
    lines.push(` * File structure: ${typing.kind}`);
    lines.push(` * Library Dependencies: ${typing.libraryDependencies.length ? typing.libraryDependencies.join(", ") : "none"}`);
    lines.push(` * Module Dependencies: ${typing.moduleDependencies.length ? typing.moduleDependencies.join(", ") : "none"}`);
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