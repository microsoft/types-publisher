"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLicenseFileText = exports.createReadme = exports.createNotNeededPackageJSON = exports.createPackageJSON = void 0;
const definitelytyped_header_parser_1 = require("definitelytyped-header-parser");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const settings_1 = require("./lib/settings");
const versions_1 = require("./lib/versions");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const tgz_1 = require("./util/tgz");
const util_1 = require("./util/util");
const mitLicense = fs_extra_1.readFileSync(util_1.joinPaths(__dirname, "..", "LICENSE"), "utf-8");
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
        log(` * ${pkg.desc}`);
    }
    log("## Generating deprecated packages");
    await npm_client_1.withNpmCache(new npm_client_1.UncachedNpmInfoClient(), async (client) => {
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
    const packageFS = typing.isLatest ? typesDirectory : typesDirectory.subDir(typing.versionDirectoryName);
    await writeCommonOutputs(typing, createPackageJSON(typing, version, packages, common_1.Registry.NPM), createReadme(typing), common_1.Registry.NPM);
    await writeCommonOutputs(typing, createPackageJSON(typing, version, packages, common_1.Registry.Github), createReadme(typing), common_1.Registry.Github);
    await Promise.all(typing.files.map(async (file) => io_1.writeFile(await outputFilePath(typing, common_1.Registry.NPM, file), packageFS.readFile(file))));
    await Promise.all(typing.files.map(async (file) => io_1.writeFile(await outputFilePath(typing, common_1.Registry.Github, file), packageFS.readFile(file))));
}
async function generateNotNeededPackage(pkg, client, log) {
    pkg = versions_1.skipBadPublishes(pkg, client, log);
    await writeCommonOutputs(pkg, createNotNeededPackageJSON(pkg, common_1.Registry.NPM), pkg.readme(), common_1.Registry.NPM);
    await writeCommonOutputs(pkg, createNotNeededPackageJSON(pkg, common_1.Registry.Github), pkg.readme(), common_1.Registry.Github);
}
async function writeCommonOutputs(pkg, packageJson, readme, registry) {
    await fs_extra_1.mkdir(pkg.outputDirectory + (registry === common_1.Registry.Github ? "-github" : ""));
    await Promise.all([
        writeOutputFile("package.json", packageJson),
        writeOutputFile("README.md", readme),
        writeOutputFile("LICENSE", getLicenseFileText(pkg)),
    ]);
    async function writeOutputFile(filename, content) {
        await io_1.writeFile(await outputFilePath(pkg, registry, filename), content);
    }
}
async function outputFilePath(pkg, registry, filename) {
    const full = util_1.joinPaths(pkg.outputDirectory + (registry === common_1.Registry.Github ? "-github" : ""), filename);
    const dir = path.dirname(full);
    if (dir !== pkg.outputDirectory) {
        await fs_extra_1.mkdirp(dir);
    }
    return full;
}
function createPackageJSON(typing, version, packages, registry) {
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
        types: "index.d.ts",
        typesVersions: definitelytyped_header_parser_1.makeTypesVersionsForPackageJson(typing.typesVersions),
        repository: {
            type: "git",
            url: registry === common_1.Registry.Github
                ? "https://github.com/types/_definitelytypedmirror.git"
                : "https://github.com/DefinitelyTyped/DefinitelyTyped.git",
            directory: `types/${typing.name}`,
        },
        scripts: {},
        dependencies: getDependencies(typing.packageJsonDependencies, typing, packages),
        typesPublisherContentHash: typing.contentHash,
        typeScriptVersion: typing.minTypeScriptVersion,
    };
    if (registry === common_1.Registry.Github) {
        out.publishConfig = { registry: "https://npm.pkg.github.com/" };
    }
    return JSON.stringify(out, undefined, 4);
}
exports.createPackageJSON = createPackageJSON;
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
            dependencies[typesDependency] = dependencySemver(dependency.version);
        }
    }
    return util_1.sortObjectKeys(dependencies);
}
function dependencySemver(dependency) {
    return dependency === "*" ? dependency : `^${dependency}`;
}
function createNotNeededPackageJSON({ libraryName, license, unescapedName, fullNpmName, sourceRepoURL, version, }, registry) {
    const out = {
        name: fullNpmName,
        version: version.versionString,
        typings: null,
        description: `Stub TypeScript definitions entry for ${libraryName}, which provides its own types definitions`,
        main: "",
        scripts: {},
        author: "",
        repository: registry === common_1.Registry.NPM ? sourceRepoURL : "https://github.com/types/_definitelytypedmirror.git",
        license,
        // No `typings`, that's provided by the dependency.
        dependencies: {
            [unescapedName]: "*",
        },
    };
    if (registry === common_1.Registry.Github) {
        out.publishConfig = { registry: "https://npm.pkg.github.com/" };
    }
    return JSON.stringify(out, undefined, 4);
}
exports.createNotNeededPackageJSON = createNotNeededPackageJSON;
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
    lines.push(`Files were exported from ${definitelyTypedURL}/tree/${settings_1.sourceBranch}/types/${typing.subDirectoryPath}.`);
    lines.push("");
    lines.push("### Additional Details");
    lines.push(` * Last updated: ${(new Date()).toUTCString()}`);
    const dependencies = Array.from(typing.dependencies).map(d => packages_1.getFullNpmName(d.name));
    lines.push(` * Dependencies: ${dependencies.length ? dependencies.map(d => `[${d}](https://npmjs.com/package/${d})`).join(", ") : "none"}`);
    lines.push(` * Global values: ${typing.globals.length ? typing.globals.map(g => `\`${g}\``).join(", ") : "none"}`);
    lines.push("");
    lines.push("# Credits");
    const contributors = typing.contributors.map(({ name, url }) => `[${name}](${url})`).join(", ").replace(/, ([^,]+)$/, ", and $1");
    lines.push(`These definitions were written by ${contributors}.`);
    lines.push("");
    return lines.join("\r\n");
}
exports.createReadme = createReadme;
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
exports.getLicenseFileText = getLicenseFileText;
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