import { testo } from "../util/util";
import { AllPackages, License, NotNeededPackage, TypesDataFile } from "../lib/packages";
import getAffectedPackages from "./get-affected-packages";

const typesData: TypesDataFile = {
    jquery: {
        "1": {
            libraryName: "JQuery",
            typingsPackageName: "jquery",
            files: ["index.d.ts"],
            libraryMajorVersion: 1,
            libraryMinorVersion: 0,
            dependencies: [
                { name: "known", majorVersion: 1 },
                { name: "most-recent", majorVersion: "*" },
                { name: "unknown", majorVersion: 1 },
                { name: "deleted", majorVersion: 15 },
            ],
            testDependencies: [
                "known-test",
                "unknown-test",
                "deleted-test"],
            pathMappings: [],
            contributors: [
                { name: "Bender", url: "futurama.com", githubUsername: "bender" },
                { name: "Fry", url: "futurama.com", githubUsername: "stephen_fry" },
                { name: "Leela", url: "futurama.com", githubUsername: "cyclopsian" },
                { name: "Dr John Zoidberg", url: "futurama.com", githubUsername: "zoidberg" },
            ],
            minTsVersion: "2.3",
            typesVersions: [],
            license: License.MIT,
            packageJsonDependencies: [],
            contentHash: "11111111111111",
            projectName: "jquery.com",
            globals: ["jquery", "JQuery", "$"],
            declaredModules: ["jquery"],
        },
    },
    known: {
        "1": {
            libraryName: "A known package",
            typingsPackageName: "known",
            files: ["index.d.ts"],
            libraryMajorVersion: 1,
            libraryMinorVersion: 0,
            dependencies: [],
            testDependencies: [],
            pathMappings: [],
            contributors: [
                { name: "Fry", url: "futurama.com", githubUsername: "stephen_fry" },
            ],
            minTsVersion: "2.3",
            typesVersions: [],
            license: License.MIT,
            packageJsonDependencies: [],
            contentHash: "22222222222222",
            projectName: "",
            globals: [],
            declaredModules: [],
        }
    },
    "known-test": {
        "1": {
            libraryName: "A known package, used for most-recent version testing",
            typingsPackageName: "known-test",
            files: ["index.d.ts"],
            libraryMajorVersion: 1,
            libraryMinorVersion: 0,
            dependencies: [],
            testDependencies: [],
            pathMappings: [],
            contributors: [
                { name: "Leela", url: "futurama.com", githubUsername: "leela" },
            ],
            minTsVersion: "2.3",
            typesVersions: [],
            license: License.MIT,
            packageJsonDependencies: [],
            contentHash: "4444444444444444",
            projectName: "",
            globals: [],
            declaredModules: [],
        }
    },
    "most-recent": {
        "2": {
            libraryName: "A known package, used for most-recent version testing",
            typingsPackageName: "most-recent",
            files: ["index.d.ts"],
            libraryMajorVersion: 1,
            libraryMinorVersion: 0,
            dependencies: [],
            testDependencies: [],
            pathMappings: [],
            contributors: [
                { name: "Dr John Zoidberg", url: "futurama.com", githubUsername: "zoidberg" },
            ],
            minTsVersion: "2.3",
            typesVersions: [],
            license: License.MIT,
            packageJsonDependencies: [],
            contentHash: "333333333333333",
            projectName: "",
            globals: [],
            declaredModules: [],
        }
    },
};

testo({
    simpleDependency() {
        const packages = [{ name: "jquery", majorVersion: 1 }]
        const notNeeded = [
            new NotNeededPackage({ typingsPackageName: "jest", libraryName: "jest", asOfVersion: "100.0.0", sourceRepoURL: "jest.com" })
        ];
        const allPackages = AllPackages.from(
            typesData,
            notNeeded
        );
        const affected = getAffectedPackages(allPackages, packages);
        expect(affected.changedPackages.length).toEqual(1);
        expect(affected.dependentPackages.length).toEqual(3);
    }
})
