"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generate_packages_1 = require("./generate-packages");
const packages_1 = require("./lib/packages");
const test_1 = require("./util/test");
// import { createMockDT } from "./mocks"
const raw = {
    libraryName: "jquery",
    typingsPackageName: "jquery",
    dependencies: [],
    testDependencies: [],
    pathMappings: [],
    contributors: [{ name: "Steve", url: "ballmer@microsoft.com", githubUsername: "OPEN SOURCE?" }],
    libraryMajorVersion: 1,
    libraryMinorVersion: 0,
    minTsVersion: "3.0",
    typesVersions: [],
    files: ["index.d.ts", "jquery.test.ts"],
    license: "MIT" /* MIT */,
    packageJsonDependencies: [],
    contentHash: "1111111111111",
    projectName: "jquery.org",
    globals: [],
    declaredModules: ["juqery"],
};
const mockTypingsData = new packages_1.TypingsData(raw, /*isLatest*/ true);
test_1.testo({
    getLicenseFileText() {
        expect(generate_packages_1.getLicenseFileText(mockTypingsData)).toEqual(expect.stringContaining("MIT License"));
    }
});
//# sourceMappingURL=generate-packages.test.js.map