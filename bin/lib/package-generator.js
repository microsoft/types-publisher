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
const fs_extra_1 = require("fs-extra");
const path = require("path");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const packages_1 = require("./packages");
const settings_1 = require("./settings");
/** Generates the package to disk */
function generateAnyPackage(pkg, packages, versions, fs) {
    return pkg.isNotNeeded() ? generateNotNeededPackage(pkg, versions) : generatePackage(pkg, packages, versions, fs);
}
exports.default = generateAnyPackage;
const mitLicense = fs_extra_1.readFileSync(util_1.joinPaths(__dirname, "..", "..", "LICENSE"), "utf-8");
function generatePackage(typing, packages, versions, fs) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        const packageFS = fs.subDir("types").subDir(typing.name);
        const packageJson = yield createPackageJSON(typing, versions.getVersion(typing), packages);
        log("Write metadata files to disk");
        yield writeCommonOutputs(typing, packageJson, createReadme(typing));
        yield Promise.all(typing.files.map((file) => __awaiter(this, void 0, void 0, function* () {
            log(`Copy ${file}`);
            yield io_1.writeFile(yield outputFilePath(typing, file), yield packageFS.readFile(file));
        })));
        return logResult();
    });
}
function generateNotNeededPackage(pkg, versions) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        const packageJson = createNotNeededPackageJSON(pkg, versions.getVersion(pkg));
        log("Write metadata files to disk");
        yield writeCommonOutputs(pkg, packageJson, pkg.readme());
        return logResult();
    });
}
function writeCommonOutputs(pkg, packageJson, readme) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs_extra_1.mkdir(pkg.outputDirectory);
        yield Promise.all([
            writeOutputFile("package.json", packageJson),
            writeOutputFile("README.md", readme),
            writeOutputFile("LICENSE", getLicenseFileText(pkg)),
        ]);
        function writeOutputFile(filename, content) {
            return __awaiter(this, void 0, void 0, function* () {
                yield io_1.writeFile(yield outputFilePath(pkg, filename), content);
            });
        }
    });
}
function outputFilePath(pkg, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const full = util_1.joinPaths(pkg.outputDirectory, filename);
        const dir = path.dirname(full);
        if (dir !== pkg.outputDirectory) {
            yield fs_extra_1.mkdirp(dir);
        }
        return full;
    });
}
function createPackageJSON(typing, version, packages) {
    return __awaiter(this, void 0, void 0, function* () {
        // typing may provide a partial `package.json` for us to complete
        const dependencies = getDependencies(typing.packageJsonDependencies, typing, packages);
        // Use the ordering of fields from https://docs.npmjs.com/files/package.json
        const out = {
            name: typing.fullNpmName,
            version: version.versionString,
            description: `TypeScript definitions for ${typing.libraryName}`,
            // keywords,
            // homepage,
            // bugs,
            license: typing.license,
            contributors: typing.contributors,
            main: "",
            repository: {
                type: "git",
                url: `${typing.sourceRepoURL}.git`
            },
            scripts: {},
            dependencies,
            typesPublisherContentHash: typing.contentHash,
            typeScriptVersion: typing.typeScriptVersion
        };
        return JSON.stringify(out, undefined, 4);
    });
}
/** Adds inferred dependencies to `dependencies`, if they are not already specified in either `dependencies` or `peerDependencies`. */
function getDependencies(packageJsonDependencies, typing, allPackages) {
    const dependencies = {};
    for (const { name, version } of packageJsonDependencies) {
        dependencies[name] = version;
    }
    for (const dependency of typing.dependencies) {
        const typesDependency = packages_1.fullNpmName(dependency.name);
        // A dependency "foo" is already handled if we already have a dependency on the package "foo" or "@types/foo".
        function handlesDependency(deps) {
            return util_1.hasOwnProperty(deps, dependency.name) || util_1.hasOwnProperty(deps, typesDependency);
        }
        if (!handlesDependency(dependencies) && allPackages.hasTypingFor(dependency)) {
            dependencies[typesDependency] = dependencySemver(dependency.majorVersion);
        }
    }
    return dependencies;
}
function dependencySemver(dependency) {
    return dependency === "*" ? dependency : `^${dependency}`;
}
function createNotNeededPackageJSON({ libraryName, license, name, fullNpmName, sourceRepoURL }, version) {
    return JSON.stringify({
        name: fullNpmName,
        version: version.versionString,
        typings: null,
        description: `Stub TypeScript definitions entry for ${libraryName}, which provides its own types definitions`,
        main: "",
        scripts: {},
        author: "",
        repository: sourceRepoURL,
        license,
        // No `typings`, that's provided by the dependency.
        dependencies: {
            [name]: "*"
        }
    }, undefined, 4);
}
function createReadme(typing) {
    const lines = [];
    lines.push("# Installation");
    lines.push(`> \`npm install --save ${typing.fullNpmName}\``);
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
    lines.push(`Files were exported from ${typing.sourceRepoURL}/tree/${settings_1.sourceBranch}/types/${typing.subDirectoryPath}`);
    lines.push("");
    lines.push("Additional Details");
    lines.push(` * Last updated: ${(new Date()).toUTCString()}`);
    const dependencies = Array.from(typing.dependencies).map(d => d.name);
    lines.push(` * Dependencies: ${dependencies.length ? dependencies.join(", ") : "none"}`);
    lines.push(` * Global values: ${typing.globals.length ? typing.globals.join(", ") : "none"}`);
    lines.push("");
    lines.push("# Credits");
    const contributors = typing.contributors.map(({ name, url }) => `${name} <${url}>`).join(", ");
    lines.push(`These definitions were written by ${contributors}.`);
    lines.push("");
    return lines.join("\r\n");
}
function getLicenseFileText(typing) {
    switch (typing.license) {
        case "MIT" /* MIT */:
            return mitLicense;
        case "Apache-2.0" /* Apache20 */:
            return apacheLicense(typing);
        default:
            throw util_1.assertNever(typing);
    }
}
function apacheLicense(typing) {
    const year = new Date().getFullYear();
    const names = typing.contributors.map(c => c.name);
    // tslint:disable max-line-length
    return `Copyright ${year} ${names.join(", ")}
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.`;
    // tslint:enable max-line-length
}
//# sourceMappingURL=package-generator.js.map