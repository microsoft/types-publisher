"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_definitions_1 = require("./parse-definitions");
const get_definitely_typed_1 = require("./get-definitely-typed");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
function createMockDT() {
    const root = new get_definitely_typed_1.Dir(undefined);
    root.set("notNeededPackages.json", `{
    "packages": [{
    "libraryName": "Angular 2",
    "typingsPackageName": "angular",
    "asOfVersion": "1.2.3",
    "sourceRepoURL": "https://github.com/angular/angular2"
  }]
}`);
    const types = root.subdir("types");
    const jquery = types.subdir("jquery");
    jquery.set("JQuery.d.ts", `
declare var jQuery: 1;
`);
    jquery.set("index.d.ts", `// Type definitions for jquery 3.3
// Project: https://jquery.com
// Definitions by: Leonard Thieu <https://github.com/leonard-thieu>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.3

/// <reference path="JQuery.d.ts" />

export = jQuery;
`);
    jquery.set("jquery-tests.ts", `
console.log(jQuery);
`);
    jquery.set("tsconfig.json", `{
    "compilerOptions": {
        "module": "commonjs",
        "lib": [
            "es6",
            "dom"
        ],
        "target": "es6",
        "noImplicitAny": true,
        "noImplicitThis": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "baseUrl": "../",
        "typeRoots": [
            "../"
        ],
        "types": [],
        "noEmit": true,
        "forceConsistentCasingInFileNames": true
    },
    "files": [
        "index.d.ts",
        "jquery-tests.ts"
    ]
}

`);
    return new get_definitely_typed_1.InMemoryDT(root, "DefinitelyTyped");
}
util_1.testo({
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
        const defs = await parse_definitions_1.default(createMockDT(), undefined, log);
        expect(defs.allNotNeeded().length).toBe(1);
        expect(defs.allTypings().length).toBe(1);
        const j = defs.tryGetLatestVersion("jquery");
        expect(j).toBeDefined();
        expect(j.fullNpmName).toContain("types");
        expect(j.fullNpmName).toContain("jquery");
        expect(defs.allPackages().length).toEqual(defs.allTypings().length + defs.allNotNeeded().length);
    }
});
//# sourceMappingURL=parse-definitions.test.js.map