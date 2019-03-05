"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util/util");
const packages_1 = require("../lib/packages");
const get_affected_packages_1 = require("./get-affected-packages");
function createTypingsVersionRaw(name, dependencies, testDependencies) {
    return {
        "1": {
            libraryName: name,
            typingsPackageName: name,
            dependencies,
            testDependencies,
            files: ["index.d.ts"],
            libraryMajorVersion: 1,
            libraryMinorVersion: 0,
            pathMappings: [],
            contributors: [{ name: "Bender", url: "futurama.com", githubUsername: "bender" },],
            minTsVersion: "2.3",
            typesVersions: [],
            license: "MIT" /* MIT */,
            packageJsonDependencies: [],
            contentHash: "11111111111111",
            projectName: "zombo.com",
            globals: [],
            declaredModules: [],
        },
    };
}
const typesData = {
    jquery: createTypingsVersionRaw("jquery", [], []),
    known: createTypingsVersionRaw("known", [{ name: "jquery", majorVersion: 1 }], []),
    "known-test": createTypingsVersionRaw("known-test", [], ["jquery"]),
    "most-recent": createTypingsVersionRaw("most-recent", [{ name: "jquery", majorVersion: "*" }], []),
    unknown: createTypingsVersionRaw("unknown", [{ name: "COMPLETELY-UNKNOWN", majorVersion: 1 }], []),
    "unknown-test": createTypingsVersionRaw("unknown-test", [], ["WAT"]),
};
const notNeeded = [
    new packages_1.NotNeededPackage({ typingsPackageName: "jest", libraryName: "jest", asOfVersion: "100.0.0", sourceRepoURL: "jest.com" })
];
const allPackages = packages_1.AllPackages.from(typesData, notNeeded);
util_1.testo({
    updatedPackage() {
        const affected = get_affected_packages_1.default(allPackages, [{ name: "jquery", majorVersion: 1 }]);
        expect(affected.changedPackages.length).toEqual(1);
        expect(affected.changedPackages[0].data).toEqual(typesData.jquery[1]);
        expect(affected.dependentPackages.length).toEqual(3);
    },
    deletedPackage() {
        const affected = get_affected_packages_1.default(allPackages, [{ name: "WAT", majorVersion: "*" }]);
        expect(affected.changedPackages.length).toEqual(0);
        expect(affected.dependentPackages.length).toEqual(1);
    }
});
//# sourceMappingURL=get-affected-packages.test.js.map