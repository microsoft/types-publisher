import { testo, createTypingsVersionRaw } from "../util/test";
import { AllPackages, NotNeededPackage, TypesDataFile } from "../lib/packages";
import { checkDeletedFiles } from "./test-runner";

const typesData: TypesDataFile = {
    jquery: createTypingsVersionRaw("jquery", [], []),
    known: createTypingsVersionRaw("known", [{ name: "jquery", majorVersion: 1 }], []),
    "known-test": createTypingsVersionRaw("known-test", [], ["jquery"]),
    "most-recent": createTypingsVersionRaw("most-recent", [{ name: "jquery", majorVersion: "*" }], []),
    unknown: createTypingsVersionRaw("unknown", [{ name: "COMPLETELY-UNKNOWN", majorVersion: 1 }], []),
    "unknown-test": createTypingsVersionRaw("unknown-test", [], ["WAT"]),
};

const notNeeded = [
    new NotNeededPackage({ typingsPackageName: "jest", libraryName: "jest", asOfVersion: "100.0.0", sourceRepoURL: "jest.com" })
];
const allPackages = AllPackages.from(typesData, notNeeded);


testo({
    ok() {
        checkDeletedFiles(allPackages, [
            { status: "M", file: "notNeededPackages.json" },
            { status: "D", file: "types/jest/index.d.ts" },
            { status: "D", file: "types/jest/jest-tests.d.ts" },
        ]);
    },
    extraneousFile() {
        checkDeletedFiles(allPackages, [
            { status: "A", file: "oooooooooooops.txt" },
            { status: "M", file: "notNeededPackages.json" },
            { status: "D", file: "types/jest/index.d.ts" },
            { status: "D", file: "types/jest/jest-tests.d.ts" },
        ]);
    },
    // TODO: Test with dependents, etc etc
});
