// tslint:disable:object-literal-key-quotes

import { createMockDT } from "../mocks";

import { getTypingInfo } from "./definition-parser";

describe(getTypingInfo, () => {
    it("keys data by major.minor version", () => {
        const dt = createMockDT();
        dt.addOldVersionOfPackage("jquery", "1.42");
        dt.addOldVersionOfPackage("jquery", "2");
        const info = getTypingInfo("jquery", dt.pkgFS("jquery"));

        expect(Object.keys(info).sort()).toEqual(["1.42", "2.0", "3.3"]);
    });

    describe("concerning validation", () => {
        it("throws if a directory exists for the latest version", () => {
            const dt = createMockDT();
            dt.addOldVersionOfPackage("jquery", "3");

            expect(() => {
                getTypingInfo("jquery", dt.pkgFS("jquery"));
            }).toThrow("The latest version is 3.3, but a directory v3 exists.");
        });
    });

    describe("concerning multiple versions", () => {
        it("does not consider minor versions when there's a single version entry", () => {
            const fs = createMockDT().pkgFS("jquery");
            const info = getTypingInfo("jquery", fs);

            expect(info).toEqual({
                "3.3": expect.objectContaining({
                    considerLibraryMinorVersion: false,
                }),
            });
        });

        it("does not consider minor versions when the old version entries only use major versions in their directory names", () => {
            const dt = createMockDT();
            dt.addOldVersionOfPackage("jquery", "2");
            const info = getTypingInfo("jquery", dt.pkgFS("jquery"));

            expect(info).toEqual({
                "2.0": expect.objectContaining({
                    considerLibraryMinorVersion: false,
                }),
                "3.3": expect.objectContaining({
                    considerLibraryMinorVersion: false,
                }),
            });
        });

        it("considers minor versions when at least one old version entry uses a minor version in its directory name", () => {
            const dt = createMockDT();
            dt.addOldVersionOfPackage("globby", "0.1");
            const info = getTypingInfo("globby", dt.pkgFS("globby"));

            expect(info).toEqual({
                "0.1": expect.objectContaining({
                    considerLibraryMinorVersion: true,
                }),
                "0.2": expect.objectContaining({
                    considerLibraryMinorVersion: true,
                }),
            });
        });

        it("records what the version directory looks like on disk", () => {
            const dt = createMockDT();
            dt.addOldVersionOfPackage("jquery", "2");
            dt.addOldVersionOfPackage("jquery", "1.5");
            const info = getTypingInfo("jquery", dt.pkgFS("jquery"));

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
            const dt = createMockDT();
            dt.addOldVersionOfPackage("jquery", "2");
            dt.addOldVersionOfPackage("jquery", "1.5");
            const info = getTypingInfo("jquery", dt.pkgFS("jquery"));

            expect(info).toEqual({
                "1.5": expect.objectContaining({
                    pathMappings: [{
                        packageName: "jquery",
                        majorVersion: 1,
                        minorVersion: 5,
                    }],
                }),
                "2.0": expect.objectContaining({
                    pathMappings: [{
                        packageName: "jquery",
                        majorVersion: 2,
                        minorVersion: undefined,
                    }],
                }),
                "3.3": expect.objectContaining({
                    // The latest version does not have path mappings of its own
                    pathMappings: [],
                }),
            });
        });
    });
});
