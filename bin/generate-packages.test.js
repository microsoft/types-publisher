"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generate_packages_1 = require("./generate-packages");
const common_1 = require("./lib/common");
const packages_1 = require("./lib/packages");
const mocks_1 = require("./mocks");
const test_1 = require("./util/test");
function createRawPackage(license) {
    return {
        libraryName: "jquery",
        typingsPackageName: "jquery",
        dependencies: [],
        testDependencies: [],
        pathMappings: [],
        contributors: [{ name: "A", url: "b@c.d", githubUsername: "e" }],
        libraryMajorVersion: 1,
        libraryMinorVersion: 0,
        minTsVersion: "3.0",
        typesVersions: [],
        files: ["index.d.ts", "jquery.test.ts"],
        license,
        packageJsonDependencies: [],
        contentHash: "11",
        projectName: "jquery.org",
        globals: [],
        declaredModules: ["juqery"],
    };
}
function createTypesData() {
    return {
        jquery: {
            1: createRawPackage("MIT" /* MIT */),
        },
    };
}
function createUnneededPackage() {
    return new packages_1.NotNeededPackage({
        libraryName: "absalom",
        typingsPackageName: "absalom",
        asOfVersion: "1.1.1",
        sourceRepoURL: "https://github.com/aardwulf/absalom",
    });
}
test_1.testo({
    mitLicenseText() {
        const typing = new packages_1.TypingsData(createRawPackage("MIT" /* MIT */), /*isLatest*/ true);
        expect(generate_packages_1.getLicenseFileText(typing)).toEqual(expect.stringContaining("MIT License"));
    },
    apacheLicenseText() {
        const typing = new packages_1.TypingsData(createRawPackage("Apache-2.0" /* Apache20 */), /*isLatest*/ true);
        expect(generate_packages_1.getLicenseFileText(typing)).toEqual(expect.stringContaining("Apache License, Version 2.0"));
    },
    basicReadme() {
        const typing = new packages_1.TypingsData(createRawPackage("Apache-2.0" /* Apache20 */), /*isLatest*/ true);
        expect(generate_packages_1.createReadme(typing)).toEqual(expect.stringContaining("This package contains type definitions for"));
    },
    readmeContainsProjectName() {
        const typing = new packages_1.TypingsData(createRawPackage("Apache-2.0" /* Apache20 */), /*isLatest*/ true);
        expect(generate_packages_1.createReadme(typing)).toEqual(expect.stringContaining("jquery.org"));
    },
    readmeNoDependencies() {
        const typing = new packages_1.TypingsData(createRawPackage("Apache-2.0" /* Apache20 */), /*isLatest*/ true);
        expect(generate_packages_1.createReadme(typing)).toEqual(expect.stringContaining("Dependencies: none"));
    },
    readmeNoGlobals() {
        const typing = new packages_1.TypingsData(createRawPackage("Apache-2.0" /* Apache20 */), /*isLatest*/ true);
        expect(generate_packages_1.createReadme(typing)).toEqual(expect.stringContaining("Global values: none"));
    },
    basicPackageJson() {
        const packages = packages_1.AllPackages.from(createTypesData(), packages_1.readNotNeededPackages(mocks_1.createMockDT()));
        const typing = new packages_1.TypingsData(createRawPackage("MIT" /* MIT */), /*isLatest*/ true);
        expect(generate_packages_1.createPackageJSON(typing, "1.0", packages, common_1.Registry.NPM)).toEqual(`{
    "name": "@types/jquery",
    "version": "1.0",
    "description": "TypeScript definitions for jquery",
    "license": "MIT",
    "contributors": [
        {
            "name": "A",
            "url": "b@c.d",
            "githubUsername": "e"
        }
    ],
    "main": "",
    "types": "index.d.ts",
    "repository": {
        "type": "git",
        "url": "https://github.com/DefinitelyTyped/DefinitelyTyped.git",
        "directory": "types/jquery"
    },
    "scripts": {},
    "dependencies": {},
    "typesPublisherContentHash": "11",
    "typeScriptVersion": "3.0"
}`);
    },
    githubPackageJsonName() {
        const packages = packages_1.AllPackages.from(createTypesData(), packages_1.readNotNeededPackages(mocks_1.createMockDT()));
        const typing = new packages_1.TypingsData(createRawPackage("MIT" /* MIT */), /*isLatest*/ true);
        expect(generate_packages_1.createPackageJSON(typing, "1.0", packages, common_1.Registry.Github)).toEqual(expect.stringContaining('"name": "@types/jquery"'));
    },
    githubPackageJsonRegistry() {
        const packages = packages_1.AllPackages.from(createTypesData(), packages_1.readNotNeededPackages(mocks_1.createMockDT()));
        const typing = new packages_1.TypingsData(createRawPackage("MIT" /* MIT */), /*isLatest*/ true);
        const s = generate_packages_1.createPackageJSON(typing, "1.0", packages, common_1.Registry.Github);
        expect(s).toEqual(expect.stringContaining("publishConfig"));
        expect(s).toEqual(expect.stringContaining('"registry": "https://npm.pkg.github.com/"'));
    },
    basicNotNeededPackageJson() {
        const s = generate_packages_1.createNotNeededPackageJSON(createUnneededPackage(), common_1.Registry.NPM);
        expect(s).toEqual(`{
    "name": "@types/absalom",
    "version": "1.1.1",
    "typings": null,
    "description": "Stub TypeScript definitions entry for absalom, which provides its own types definitions",
    "main": "",
    "scripts": {},
    "author": "",
    "repository": "https://github.com/aardwulf/absalom",
    "license": "MIT",
    "dependencies": {
        "absalom": "*"
    }
}`);
    },
    githubNotNeededPackageJson() {
        const s = generate_packages_1.createNotNeededPackageJSON(createUnneededPackage(), common_1.Registry.Github);
        expect(s).toEqual(expect.stringContaining("@types"));
        expect(s).toEqual(expect.stringContaining("npm.pkg.github.com"));
    },
});
//# sourceMappingURL=generate-packages.test.js.map