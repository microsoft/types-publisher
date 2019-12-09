"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const logging_1 = require("./util/logging");
const test_1 = require("./util/test");
test_1.testo({
    async downloadDefinitelyTyped() {
        const dt = await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.azure, logging_1.loggerWithErrors()[0]);
        expect(dt.exists("types")).toBe(true);
        expect(dt.exists("buncho")).toBe(false);
    },
    createDirs() {
        const root = new get_definitely_typed_1.Dir(undefined);
        root.set("file1.txt", "ok");
        expect(root.has("file1.txt")).toBe(true);
        expect(root.get("file1.txt")).toBe("ok");
    },
    simpleMemoryFS() {
        const root = new get_definitely_typed_1.Dir(undefined);
        root.set("file1.txt", "ok");
        const dir = root.subdir("sub1");
        dir.set("file2.txt", "x");
        const fs = new get_definitely_typed_1.InMemoryDT(root, "test/");
        expect(fs.exists("file1.txt")).toBe(true);
        expect(fs.readFile("file1.txt")).toBe("ok");
        expect(fs.readFile("sub1/file2.txt")).toBe("x");
    },
});
//# sourceMappingURL=get-definitely-typed.test.js.map