"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("../util/test");
const packages_1 = require("../lib/packages");
const test_runner_1 = require("./test-runner");
const typesData = {
    jquery: test_1.createTypingsVersionRaw("jquery", [], []),
    known: test_1.createTypingsVersionRaw("known", [{ name: "jquery", majorVersion: 1 }], []),
    "known-test": test_1.createTypingsVersionRaw("known-test", [], ["jquery"]),
    "most-recent": test_1.createTypingsVersionRaw("most-recent", [{ name: "jquery", majorVersion: "*" }], []),
    unknown: test_1.createTypingsVersionRaw("unknown", [{ name: "COMPLETELY-UNKNOWN", majorVersion: 1 }], []),
    "unknown-test": test_1.createTypingsVersionRaw("unknown-test", [], ["WAT"]),
};
const jestNotNeeded = [
    new packages_1.NotNeededPackage({ typingsPackageName: "jest", libraryName: "jest", asOfVersion: "100.0.0", sourceRepoURL: "jest.com" })
];
const allPackages = packages_1.AllPackages.from(typesData, jestNotNeeded);
const deleteJestDiffs = [
    { status: "M", file: "notNeededPackages.json" },
    { status: "D", file: "types/jest/index.d.ts" },
    { status: "D", file: "types/jest/jest-tests.d.ts" },
];
test_1.testo({
    ok() {
        expect(Array.from(test_runner_1.getNotNeededPackages(allPackages, deleteJestDiffs))).toEqual(jestNotNeeded);
    },
    forgotToDeleteFiles() {
        expect(() => Array.from(test_runner_1.getNotNeededPackages(packages_1.AllPackages.from({ jest: test_1.createTypingsVersionRaw("jest", [], []) }, jestNotNeeded), deleteJestDiffs))).toThrow('Please delete all files in jest');
    },
    tooManyDeletes() {
        expect(() => Array.from(test_runner_1.getNotNeededPackages(allPackages, [{ status: "D", file: "oops.txt" }]))).toThrow("Unexpected file deleted: oops.txt");
    },
    extraneousFile() {
        Array.from(test_runner_1.getNotNeededPackages(allPackages, [
            { status: "A", file: "oooooooooooops.txt" },
            { status: "M", file: "notNeededPackages.json" },
            { status: "D", file: "types/jest/index.d.ts" },
            { status: "D", file: "types/jest/jest-tests.d.ts" },
        ]));
    },
    forgotToUpdateNotNeededJson() {
        expect(() => Array.from(test_runner_1.getNotNeededPackages(packages_1.AllPackages.from(typesData, []), [{ status: "D", file: "types/jest/index.d.ts" }]))).toThrow("Deleted package jest is not in notNeededPackages.json.");
    },
    scoped() {
        Array.from(test_runner_1.getNotNeededPackages(packages_1.AllPackages.from(typesData, [new packages_1.NotNeededPackage({ typingsPackageName: "ember__object", libraryName: "@ember/object", asOfVersion: "1.0.0", sourceRepoURL: "ember.js" })]), [{ status: "D", file: "types/ember__object/index.d.ts" }]));
    },
});
const empty = {
    distTags: new Map(),
    versions: new Map(),
    timeModified: ""
};
test_1.testo({
    missingSource() {
        expect(() => test_runner_1.checkNotNeededPackage(jestNotNeeded[0], undefined, empty))
            .toThrow("The entry for @types/jest in notNeededPackages.json");
    },
    missingTypings() {
        expect(() => test_runner_1.checkNotNeededPackage(jestNotNeeded[0], empty, undefined))
            .toThrow("@types package not found for @types/jest");
    },
    missingTypingsLatest() {
        expect(() => test_runner_1.checkNotNeededPackage(jestNotNeeded[0], empty, empty))
            .toThrow("@types/jest is missing the \"latest\" tag");
    },
    deprecatedSameVersion() {
        expect(() => test_runner_1.checkNotNeededPackage(jestNotNeeded[0], empty, { distTags: new Map([["latest", "100.0.0"]]), versions: new Map(), timeModified: "" }))
            .toThrow(`The specified version 100.0.0 of jest must be newer than the version
it is supposed to replace, 100.0.0 of @types/jest.`);
    },
    deprecatedOlderVersion() {
        expect(() => test_runner_1.checkNotNeededPackage(jestNotNeeded[0], empty, { distTags: new Map([["latest", "999.0.0"]]), versions: new Map(), timeModified: "" }))
            .toThrow(`The specified version 100.0.0 of jest must be newer than the version
it is supposed to replace, 999.0.0 of @types/jest.`);
    },
    missingNpmVersion() {
        expect(() => test_runner_1.checkNotNeededPackage(jestNotNeeded[0], empty, { distTags: new Map([["latest", "4.0.0"]]), versions: new Map(), timeModified: "" }))
            .toThrow(`The specified version 100.0.0 of jest is not on npm.`);
    },
    olderNpmVersion() {
        expect(() => test_runner_1.checkNotNeededPackage(jestNotNeeded[0], { distTags: new Map(), versions: new Map([["50.0.0", {}]]), timeModified: "" }, { distTags: new Map([["latest", "4.0.0"]]), versions: new Map(), timeModified: "" }))
            .toThrow(`The specified version 100.0.0 of jest is not on npm.`);
    },
    ok() {
        test_runner_1.checkNotNeededPackage(jestNotNeeded[0], { distTags: new Map(), versions: new Map([["100.0.0", {}]]), timeModified: "" }, { distTags: new Map([["latest", "4.0.0"]]), versions: new Map(), timeModified: "" });
    },
});
//# sourceMappingURL=test-runner.test.js.map