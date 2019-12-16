"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_definitely_typed_1 = require("../get-definitely-typed");
const module_info_1 = require("./module-info");
const test_1 = require("../util/test");
const mocks_1 = require("../mocks");
const ts = require("typescript");
const fs = mocks_1.createMockDT();
function getBoringReferences() {
    return module_info_1.allReferencedFiles(["index.d.ts", "boring-tests.ts"], fs.subDir("types").subDir("boring"), "boring", "types/boring");
}
test_1.testo({
    allReferencedFilesFromTsconfigFiles() {
        const { types, tests } = getBoringReferences();
        expect(Array.from(types.keys())).toEqual(["index.d.ts", "secondary.d.ts", "quaternary.d.ts", "tertiary.d.ts", "commonjs.d.ts", "v1.d.ts"]);
        expect(Array.from(tests.keys())).toEqual(["boring-tests.ts"]);
    },
    allReferencedFilesFromTestIncludesSecondaryInternalFiles() {
        const { types, tests } = module_info_1.allReferencedFiles(["boring-tests.ts"], fs.subDir("types").subDir("boring"), "boring", "types/boring");
        expect(Array.from(types.keys())).toEqual(["secondary.d.ts", "quaternary.d.ts", "tertiary.d.ts", "commonjs.d.ts", "v1.d.ts"]);
        expect(Array.from(tests.keys())).toEqual(["boring-tests.ts"]);
    },
    allReferencedFilesFromTsconfigGlobal() {
        const { types, tests } = module_info_1.allReferencedFiles(["jquery-tests.ts", "index.d.ts"], fs.subDir("types").subDir("jquery"), "jquery", "types/jquery");
        expect(Array.from(types.keys())).toEqual(["index.d.ts", "JQuery.d.ts"]);
        expect(Array.from(tests.keys())).toEqual(["jquery-tests.ts"]);
    },
    allReferencedFilesFromTestIncludesSecondaryTripleSlashTypes() {
        const { types, tests } = module_info_1.allReferencedFiles(["globby-tests.ts", "test/other-tests.ts"], fs.subDir("types").subDir("globby"), "globby", "types/globby");
        expect(Array.from(types.keys())).toEqual(["merges.d.ts"]);
        expect(Array.from(tests.keys())).toEqual(["globby-tests.ts", "test/other-tests.ts"]);
    },
    getModuleInfoWorksWithOtherFiles() {
        const { types } = getBoringReferences();
        // written as if it were from OTHER_FILES.txt
        types.set("untested.d.ts", ts.createSourceFile("untested.d.ts", fs.subDir("types").subDir("boring").readFile("untested.d.ts"), ts.ScriptTarget.Latest, false));
        const i = module_info_1.getModuleInfo("boring", types);
        expect(i.dependencies).toEqual(new Set(['manual', 'react', 'react-default', 'things', 'vorticon']));
    },
    getModuleInfoForNestedTypeReferences() {
        const { types } = module_info_1.allReferencedFiles(["index.d.ts", "globby-tests.ts", "test/other-tests.ts"], fs.subDir("types").subDir("globby"), "globby", "types/globby");
        expect(Array.from(types.keys())).toEqual(["index.d.ts", "sneaky.d.ts", "merges.d.ts"]);
        const i = module_info_1.getModuleInfo("globby", types);
        expect(i.dependencies).toEqual(new Set(['andere']));
    },
    versionTypeRefThrows() {
        const fail = new get_definitely_typed_1.Dir(undefined);
        const fs = new get_definitely_typed_1.InMemoryDT(fail, "typeref-fails");
        fail.set("index.d.ts", `// Type definitions for fail 1.0
// Project: https://youtube.com/typeref-fails
// Definitions by: Type Ref Fails <https://github.com/typeref-fails>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="elser/v3" />
`);
        const { types } = module_info_1.allReferencedFiles(["index.d.ts"], fs, "typeref-fails", "types/typeref-fails");
        expect(Array.from(types.keys())).toEqual(["index.d.ts"]);
        expect(() => module_info_1.getModuleInfo("typeref-fails", types)).toThrow("do not directly import specific versions of another types package");
    },
    getTestDependenciesWorks() {
        const { types, tests } = getBoringReferences();
        const i = module_info_1.getModuleInfo("boring", types);
        const d = module_info_1.getTestDependencies("boring", types, tests.keys(), i.dependencies, fs.subDir("types").subDir("boring"));
        expect(d).toEqual(new Set(["super-big-fun-hus"]));
    },
});
//# sourceMappingURL=module-info.test.js.map