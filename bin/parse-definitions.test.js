"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_definitions_1 = require("./parse-definitions");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const logging_1 = require("./util/logging");
function testo(o) {
    for (const k in o) {
        test(k, o[k], 100000);
    }
}
testo({
    async parseDefinitions() {
        const log = logging_1.loggerWithErrors()[0];
        // TODO: A mocked DT would be really nice here
        const dt = await get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults, log);
        const defs = await parse_definitions_1.default(dt, undefined, log);
        expect(defs.allNotNeeded().length).toBeGreaterThan(0);
        expect(defs.allTypings().length).toBeGreaterThan(5000);
        const j = defs.tryGetLatestVersion("jquery");
        expect(j).toBeDefined();
        expect(j.fullNpmName).toContain("types");
        expect(j.fullNpmName).toContain("jquery");
        expect(defs.allPackages().length).toEqual(defs.allTypings().length + defs.allNotNeeded().length);
    },
});
//# sourceMappingURL=parse-definitions.test.js.map