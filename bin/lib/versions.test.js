"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const versions_1 = require("./versions");
describe(versions_1.Semver, () => {
    it("returns a formatted description", () => {
        expect(new versions_1.Semver(1, 2, 3).versionString).toEqual("1.2.3");
    });
    it("parses semver versions", () => {
        expect(versions_1.Semver.parse("0.42.1").versionString).toEqual("0.42.1");
    });
    it("parses versions that do not strictly adhere to semver", () => {
        expect(versions_1.Semver.parse("1", true).versionString).toEqual("1.0.0");
        expect(versions_1.Semver.parse("0.42", true).versionString).toEqual("0.42.0");
    });
    it("throws when a version cannot be parsed", () => {
        expect(() => versions_1.Semver.parse("1")).toThrow();
        expect(() => versions_1.Semver.parse("1", false)).toThrow();
    });
    it("returns whether or not it's equal to another Semver", () => {
        expect(versions_1.Semver.parse("1.2.3").equals(new versions_1.Semver(1, 2, 3))).toBe(true);
        expect(versions_1.Semver.parse("1.2.3").equals(new versions_1.Semver(3, 2, 1))).toBe(false);
    });
    it("returns whether or not it's greater than another Semver", () => {
        expect(versions_1.Semver.parse("1.2.3").greaterThan(new versions_1.Semver(1, 2, 2))).toBe(true);
        expect(versions_1.Semver.parse("1.2.3").equals(new versions_1.Semver(1, 2, 4))).toBe(false);
    });
});
//# sourceMappingURL=versions.test.js.map