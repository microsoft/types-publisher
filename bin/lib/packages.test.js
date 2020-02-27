"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocks_1 = require("../mocks");
const definition_parser_1 = require("./definition-parser");
const packages_1 = require("./packages");
describe(packages_1.TypingsVersions, () => {
    let versions;
    beforeAll(() => {
        const dt = mocks_1.createMockDT();
        dt.addOldVersionOfPackage("jquery", "1");
        dt.addOldVersionOfPackage("jquery", "2");
        dt.addOldVersionOfPackage("jquery", "2.5");
        versions = new packages_1.TypingsVersions(definition_parser_1.getTypingInfo("jquery", dt.pkgFS("jquery")));
    });
    it("sorts the data from latest to oldest version", () => {
        expect(Array.from(versions.getAll()).map(v => v.major)).toEqual([3, 2, 2, 1]);
    });
    it("returns the latest version", () => {
        expect(versions.getLatest().major).toEqual(3);
    });
    it("finds the latest version when any version is wanted", () => {
        expect(versions.get("*").major).toEqual(3);
    });
    it("finds the latest minor version for the given major version", () => {
        expect(versions.get({ major: 2 }).major).toEqual(2);
        expect(versions.get({ major: 2 }).minor).toEqual(5);
    });
    it("finds a specific version", () => {
        expect(versions.get({ major: 2, minor: 0 }).major).toEqual(2);
        expect(versions.get({ major: 2, minor: 0 }).minor).toEqual(0);
    });
    it("formats a version directory names", () => {
        expect(versions.get({ major: 2, minor: 0 }).versionDirectoryName).toEqual("v2");
        expect(versions.get({ major: 2, minor: 0 }).subDirectoryPath).toEqual("jquery/v2");
    });
    it("formats missing version error nicely", () => {
        expect(() => versions.get({ major: 111, minor: 1001 })).toThrow("Could not find version 111.1001");
        expect(() => versions.get({ major: 111 })).toThrow("Could not find version 111.*");
    });
});
//# sourceMappingURL=packages.test.js.map