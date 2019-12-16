"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_definitions_1 = require("./parse-definitions");
const logging_1 = require("./util/logging");
const test_1 = require("./util/test");
const mocks_1 = require("./mocks");
test_1.testo({
    // async parseDefinitions() {
    //     const log = loggerWithErrors()[0]
    //     const dt = await getDefinitelyTyped(Options.defaults, log);
    //     const defs = await parseDefinitions(dt, undefined, log)
    //     expect(defs.allNotNeeded().length).toBeGreaterThan(0)
    //     expect(defs.allTypings().length).toBeGreaterThan(5000)
    //     const j = defs.tryGetLatestVersion("jquery")
    //     expect(j).toBeDefined()
    //     expect(j!.fullNpmName).toContain("types")
    //     expect(j!.fullNpmName).toContain("jquery")
    //     expect(defs.allPackages().length).toEqual(defs.allTypings().length + defs.allNotNeeded().length)
    // },
    async mockParse() {
        const log = logging_1.loggerWithErrors()[0];
        const defs = await parse_definitions_1.default(mocks_1.createMockDT(), undefined, log);
        expect(defs.allNotNeeded().length).toBe(1);
        expect(defs.allTypings().length).toBe(3);
        const j = defs.tryGetLatestVersion("jquery");
        expect(j).toBeDefined();
        expect(j.fullNpmName).toContain("types");
        expect(j.fullNpmName).toContain("jquery");
        expect(defs.allPackages().length).toEqual(defs.allTypings().length + defs.allNotNeeded().length);
    }
});
//# sourceMappingURL=parse-definitions.test.js.map