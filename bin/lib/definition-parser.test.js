"use strict";
// tslint:disable:object-literal-key-quotes
Object.defineProperty(exports, "__esModule", { value: true });
const mocks_1 = require("../mocks");
const definition_parser_1 = require("./definition-parser");
describe(definition_parser_1.getTypingInfo, () => {
    it("keys data by major.minor version", () => {
        const dt = mocks_1.createMockDT();
        dt.addOldVersionOfPackage("jquery", "1.42");
        dt.addOldVersionOfPackage("jquery", "2");
        const info = definition_parser_1.getTypingInfo("jquery", dt.pkgFS("jquery"));
        expect(Object.keys(info).sort()).toEqual(["1.42", "2.0", "3.3"]);
    });
    describe("concerning multiple versions", () => {
        it("records what the version directory looks like on disk", () => {
            const dt = mocks_1.createMockDT();
            dt.addOldVersionOfPackage("jquery", "2");
            dt.addOldVersionOfPackage("jquery", "1.5");
            const info = definition_parser_1.getTypingInfo("jquery", dt.pkgFS("jquery"));
            expect(info).toEqual({
                "1.5": expect.objectContaining({
                    libraryVersionDirectoryName: "1.5",
                }),
                "2.0": expect.objectContaining({
                    libraryVersionDirectoryName: "2",
                }),
                "3.3": expect.objectContaining({
                    // The latest version does not have its own version directory
                    libraryVersionDirectoryName: undefined,
                }),
            });
        });
        it("records a path mapping to the version directory", () => {
            const dt = mocks_1.createMockDT();
            dt.addOldVersionOfPackage("jquery", "2");
            dt.addOldVersionOfPackage("jquery", "1.5");
            const info = definition_parser_1.getTypingInfo("jquery", dt.pkgFS("jquery"));
            expect(info).toEqual({
                "1.5": expect.objectContaining({
                    pathMappings: [{
                            packageName: "jquery",
                            version: { major: 1, minor: 5 },
                        }],
                }),
                "2.0": expect.objectContaining({
                    pathMappings: [{
                            packageName: "jquery",
                            version: { major: 2, minor: undefined },
                        }],
                }),
                "3.3": expect.objectContaining({
                    // The latest version does not have path mappings of its own
                    pathMappings: [],
                }),
            });
        });
        describe("validation thereof", () => {
            it("throws if a directory exists for the latest major version", () => {
                const dt = mocks_1.createMockDT();
                dt.addOldVersionOfPackage("jquery", "3");
                expect(() => {
                    definition_parser_1.getTypingInfo("jquery", dt.pkgFS("jquery"));
                }).toThrow("The latest version is 3.3, so the subdirectory 'v3' is not allowed; " +
                    "since it applies to any 3.* version, up to and including 3.3.");
            });
            it("throws if a directory exists for the latest minor version", () => {
                const dt = mocks_1.createMockDT();
                dt.addOldVersionOfPackage("jquery", "3.3");
                expect(() => {
                    definition_parser_1.getTypingInfo("jquery", dt.pkgFS("jquery"));
                }).toThrow("The latest version is 3.3, so the subdirectory 'v3.3' is not allowed.");
            });
            it("does not throw when a minor version is older than the latest", () => {
                const dt = mocks_1.createMockDT();
                dt.addOldVersionOfPackage("jquery", "3.0");
                expect(() => {
                    definition_parser_1.getTypingInfo("jquery", dt.pkgFS("jquery"));
                }).not.toThrow();
            });
        });
    });
});
//# sourceMappingURL=definition-parser.test.js.map