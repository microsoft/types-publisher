"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function testo(o) {
    for (const k of Object.keys(o)) {
        test(k, o[k], 100000);
    }
}
exports.testo = testo;
function createTypingsVersionRaw(name, dependencies, testDependencies) {
    return {
        "1.0.0": {
            libraryName: name,
            typingsPackageName: name,
            dependencies,
            testDependencies,
            files: ["index.d.ts"],
            libraryMajorVersion: 1,
            libraryMinorVersion: 0,
            pathMappings: [],
            contributors: [{ name: "Bender", url: "futurama.com", githubUsername: "bender" }],
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
exports.createTypingsVersionRaw = createTypingsVersionRaw;
//# sourceMappingURL=test.js.map