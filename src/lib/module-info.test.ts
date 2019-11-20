import { allReferencedFiles, getModuleInfo, getTestDependencies } from "./module-info";
import { testo } from "../util/test";
import { createMockDT } from "../mocks"
import * as ts from 'typescript'
const fs = createMockDT();
async function getBoringReferences() {
    return allReferencedFiles(["index.d.ts", "boring-tests.ts"], fs.subDir("types").subDir("boring"), "boring", "types/boring")
}
testo({
    async allReferencedFilesFromTsconfigFiles() {
        const { types, tests } = await getBoringReferences();
        expect(Array.from(types.keys())).toEqual(["index.d.ts", "secondary.d.ts", "commonjs.d.ts", "quaternary.d.ts", "tertiary.d.ts"])
        expect(Array.from(tests.keys())).toEqual(["boring-tests.ts"])
    },
    async allReferencedFilesFromTestIncludesSecondaryInternalFiles() {
        const { types, tests } = await allReferencedFiles(["boring-tests.ts"], fs.subDir("types").subDir("boring"), "boring", "types/boring")
        expect(Array.from(types.keys())).toEqual(["secondary.d.ts", "commonjs.d.ts", "quaternary.d.ts", "tertiary.d.ts"])
        expect(Array.from(tests.keys())).toEqual(["boring-tests.ts"])
    },
    async allReferencedFilesFromTsconfigGlobal() {
        const { types, tests } = await allReferencedFiles(["jquery-tests.ts", "index.d.ts"], fs.subDir("types").subDir("jquery"), "jquery", "types/jquery")
        expect(Array.from(types.keys())).toEqual(["index.d.ts", "JQuery.d.ts"])
        expect(Array.from(tests.keys())).toEqual(["jquery-tests.ts"])
    },
    async allReferencedFilesFromTestIncludesSecondaryTripleSlashTypes() {
        const { types, tests } = await allReferencedFiles(["globby-tests.ts", "test/other-tests.ts"], fs.subDir("types").subDir("globby"), "globby", "types/globby")
        expect(Array.from(types.keys())).toEqual(["merges.d.ts"])
        expect(Array.from(tests.keys())).toEqual(["globby-tests.ts", "test/other-tests.ts"])
    },
    async getModuleInfoWorksWithOtherFiles() {
        const { types } = await getBoringReferences();
        types.set("untested.d.ts", ts.createSourceFile("untested.d.ts", await fs.subDir("types").subDir("boring").readFile("untested.d.ts"), ts.ScriptTarget.Latest, false));
        const i = await getModuleInfo("boring", types);
        expect(i.dependencies).toEqual(new Set(['manual', 'react', 'react-default', 'things', 'vorticon']));
    },
    async getTestDependenciesWorks() {
        const { types, tests } = await getBoringReferences();
        const i = await getModuleInfo("boring", types);
        const d = await getTestDependencies("boring", tests.keys(), i.dependencies, fs.subDir("types").subDir("boring"));
        expect(d).toEqual(new Set(["super-big-fun-hus"]));
    }
})
