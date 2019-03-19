"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const packages_1 = require("./lib/packages");
const settings_1 = require("./lib/settings");
const versions_1 = require("./lib/versions");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const tgz_1 = require("./util/tgz");
const util_1 = require("./util/util");
const definitelytyped_header_parser_1 = require("definitelytyped-header-parser");
const fs_extra_2 = require("fs-extra");
const path = require("path");
const npm_client_1 = require("./lib/npm-client");
const mitLicense = fs_extra_2.readFileSync(util_1.joinPaths(__dirname, "..", "LICENSE"), "utf-8");
if (!module.parent) {
    const tgz = !!yargs.argv.tgz;
    util_1.logUncaughtErrors(async () => {
        const log = logging_1.loggerWithErrors()[0];
        const dt = await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, log);
        const allPackages = await packages_1.AllPackages.read(dt);
        await generatePackages(dt, allPackages, await versions_1.readChangedPackages(allPackages), tgz);
    });
}
async function generatePackages(dt, allPackages, changedPackages, tgz = false) {
    const [log, logResult] = logging_1.logger();
    log("\n## Generating packages");
    await fs_extra_1.emptyDir(settings_1.outputDirPath);
    for (const { pkg, version } of changedPackages.changedTypings) {
        await generateTypingPackage(pkg, allPackages, version, dt);
        if (tgz) {
            await tgz_1.writeTgz(pkg.outputDirectory, `${pkg.outputDirectory}.tgz`);
        }
        log(` * ${pkg.libraryName}`);
    }
    log("## Generating deprecated packages");
    npm_client_1.withNpmCache(new npm_client_1.UncachedNpmInfoClient(), async (client) => {
        for (const pkg of changedPackages.changedNotNeededPackages) {
            log(` * ${pkg.libraryName}`);
            await generateNotNeededPackage(pkg, client, log);
        }
    });
    await logging_1.writeLog("package-generator.md", logResult());
}
exports.default = generatePackages;
async function generateTypingPackage(typing, packages, version, dt) {
    const typesDirectory = dt.subDir("types").subDir(typing.name);
    const packageFS = typing.isLatest ? typesDirectory : typesDirectory.subDir(`v${typing.major}`);
    const packageJson = createPackageJSON(typing, version, packages);
    await writeCommonOutputs(typing, packageJson, createReadme(typing));
    await Promise.all(typing.files.map(async (file) => io_1.writeFile(await outputFilePath(typing, file), await packageFS.readFile(file))));
}
async function generateNotNeededPackage(pkg, client, log) {
    const packageJson = createNotNeededPackageJSON(versions_1.skipBadPublishes(pkg, client, log));
    await writeCommonOutputs(pkg, packageJson, pkg.readme());
}
async function writeCommonOutputs(pkg, packageJson, readme) {
    await fs_extra_2.mkdir(pkg.outputDirectory);
    await Promise.all([
        writeOutputFile("package.json", packageJson),
        writeOutputFile("README.md", readme),
        writeOutputFile("LICENSE", getLicenseFileText(pkg)),
    ]);
    async function writeOutputFile(filename, content) {
        await io_1.writeFile(await outputFilePath(pkg, filename), content);
    }
}
async function outputFilePath(pkg, filename) {
    const full = util_1.joinPaths(pkg.outputDirectory, filename);
    const dir = path.dirname(full);
    if (dir !== pkg.outputDirectory) {
        await fs_extra_2.mkdirp(dir);
    }
    return full;
}
function createPackageJSON(typing, version, packages) {
    // Use the ordering of fields from https://docs.npmjs.com/files/package.json
    const out = {
        name: typing.fullNpmName,
        version,
        description: `TypeScript definitions for ${typing.libraryName}`,
        // keywords,
        // homepage,
        // bugs,
        license: typing.license,
        contributors: typing.contributors,
        main: "",
        types: "index",
        typesVersions: definitelytyped_header_parser_1.makeTypesVersionsForPackageJson(typing.typesVersions),
        repository: {
            type: "git",
            url: `${definitelyTypedURL}.git`,
            directory: `types/${typing.name}`,
        },
        scripts: {},
        dependencies: getDependencies(typing.packageJsonDependencies, typing, packages),
        typesPublisherContentHash: typing.contentHash,
        typeScriptVersion: typing.minTypeScriptVersion,
    };
    return JSON.stringify(out, undefined, 4);
}
const definitelyTypedURL = "https://github.com/DefinitelyTyped/DefinitelyTyped";
/** Adds inferred dependencies to `dependencies`, if they are not already specified in either `dependencies` or `peerDependencies`. */
function getDependencies(packageJsonDependencies, typing, allPackages) {
    const dependencies = {};
    for (const { name, version } of packageJsonDependencies) {
        dependencies[name] = version;
    }
    for (const dependency of typing.dependencies) {
        const typesDependency = packages_1.getFullNpmName(dependency.name);
        // A dependency "foo" is already handled if we already have a dependency on the package "foo" or "@types/foo".
        if (!packageJsonDependencies.some(d => d.name === dependency.name || d.name === typesDependency) && allPackages.hasTypingFor(dependency)) {
            dependencies[typesDependency] = dependencySemver(dependency.majorVersion);
        }
    }
    return util_1.sortObjectKeys(dependencies);
}
function dependencySemver(dependency) {
    return dependency === "*" ? dependency : `^${dependency}`;
}
function createNotNeededPackageJSON({ libraryName, license, name, fullNpmName, sourceRepoURL, version }) {
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
            [name]: "*",
        },
    }, undefined, 4);
}
function createReadme(typing) {
    const lines = [];
    lines.push("# Installation");
    lines.push(`> \`npm install --save ${typing.fullNpmName}\``);
    lines.push("");
    lines.push("# Summary");
    if (typing.projectName) {
        lines.push(`This package contains type definitions for ${typing.libraryName} ( ${typing.projectName} ).`);
    }
    else {
        lines.push(`This package contains type definitions for ${typing.libraryName}.`);
    }
    lines.push("");
    lines.push("# Details");
    lines.push(`Files were exported from ${definitelyTypedURL}/tree/${settings_1.sourceBranch}/types/${typing.subDirectoryPath}`);
    lines.push("");
    lines.push("Additional Details");
    lines.push(` * Last updated: ${(new Date()).toUTCString()}`);
    const dependencies = Array.from(typing.dependencies).map(d => packages_1.getFullNpmName(d.name));
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
//# sourceMappingURL=generate-packages.js.map