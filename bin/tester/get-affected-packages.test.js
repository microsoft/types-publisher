"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const packages_1 = require("../lib/packages");
const test_1 = require("../util/test");
const get_affected_packages_1 = require("./get-affected-packages");
const typesData = {
    jquery: test_1.createTypingsVersionRaw("jquery", [], []),
    known: test_1.createTypingsVersionRaw("known", [{ name: "jquery", version: { major: 1 } }], []),
    "known-test": test_1.createTypingsVersionRaw("known-test", [], ["jquery"]),
    "most-recent": test_1.createTypingsVersionRaw("most-recent", [{ name: "jquery", version: "*" }], []),
    unknown: test_1.createTypingsVersionRaw("unknown", [{ name: "COMPLETELY-UNKNOWN", version: { major: 1 } }], []),
    "unknown-test": test_1.createTypingsVersionRaw("unknown-test", [], ["WAT"]),
};
const notNeeded = [
    new packages_1.NotNeededPackage({ typingsPackageName: "jest", libraryName: "jest", asOfVersion: "100.0.0", sourceRepoURL: "jest.com" }),
];
const allPackages = packages_1.AllPackages.from(typesData, notNeeded);
test_1.testo({
    updatedPackage() {
        const affected = get_affected_packages_1.getAffectedPackages(allPackages, [{ name: "jquery", version: { major: 1 } }]);
        expect(affected.changedPackages.length).toEqual(1);
        expect(affected.changedPackages[0].data).toEqual(typesData.jquery["1.0.0"]);
        expect(affected.dependentPackages.length).toEqual(3);
    },
    deletedPackage() {
        const affected = get_affected_packages_1.getAffectedPackages(allPackages, [{ name: "WAT", version: "*" }]);
        expect(affected.changedPackages.length).toEqual(0);
        expect(affected.dependentPackages.length).toEqual(1);
    },
});
//# sourceMappingURL=get-affected-packages.test.js.map