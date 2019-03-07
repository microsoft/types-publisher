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
        test_runner_1.checkDeletedFiles(allPackages, deleteJestDiffs);
    },
    forgotToDeleteFiles() {
        expect(() => test_runner_1.checkDeletedFiles(packages_1.AllPackages.from({ jest: test_1.createTypingsVersionRaw("jest", [], []) }, jestNotNeeded), deleteJestDiffs)).toThrow('Please delete all files in jest');
    },
    tooManyDeletes() {
        expect(() => test_runner_1.checkDeletedFiles(allPackages, [{ status: "D", file: "oops.txt" }])).toThrow("Unexpected file deleted: oops.txt");
    },
    extraneousFile() {
        test_runner_1.checkDeletedFiles(allPackages, [
            { status: "A", file: "oooooooooooops.txt" },
            { status: "M", file: "notNeededPackages.json" },
            { status: "D", file: "types/jest/index.d.ts" },
            { status: "D", file: "types/jest/jest-tests.d.ts" },
        ]);
    },
    forgotToUpdateNotNeededJson() {
        expect(() => test_runner_1.checkDeletedFiles(packages_1.AllPackages.from(typesData, []), [{ status: "D", file: "types/jest/index.d.ts" }])).toThrow("Deleted package jest is not in notNeededPackages.json.");
    },
    scoped() {
        test_runner_1.checkDeletedFiles(packages_1.AllPackages.from(typesData, [new packages_1.NotNeededPackage({ typingsPackageName: "ember__object", libraryName: "@ember/object", asOfVersion: "1.0.0", sourceRepoURL: "ember.js" })]), [{ status: "D", file: "types/ember__object/index.d.ts" }]);
    },
});
//# sourceMappingURL=test-runner.test.js.map