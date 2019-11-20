import { allReferencedFiles, getModuleInfo } from "./module-info";
import { testo } from "../util/test";
import { createMockDT } from "../mocks"
const fs = createMockDT();
testo({
    async allReferencedFilesFromTsconfigFiles() {
        const m = await allReferencedFiles(["index.d.ts", "boring-tests.ts"], fs.subDir("types").subDir("boring"), "boring", "types/boring", "ts")
        expect(Array.from(m.keys())).toEqual(["index.d.ts", "boring-tests.ts", "secondary.d.ts", "commonjs.d.ts", "tertiary.d.ts"])
    },
    async allReferencedFilesFromTestIncludesSecondaryInternalFiles() {
        const m = await allReferencedFiles(["boring-tests.ts"], fs.subDir("types").subDir("boring"), "boring", "types/boring", "ts")
        expect(Array.from(m.keys())).toEqual(["boring-tests.ts", "secondary.d.ts", "commonjs.d.ts", "tertiary.d.ts"])
    },
    async allReferencedFilesFromTestIncludesTripleSlashTypes() {
        const m = await allReferencedFiles(["jquery-tests.ts"], fs.subDir("types").subDir("jquery"), "jquery", "types/jquery", "ts")
        expect(Array.from(m.keys())).toEqual(["jquery-tests.ts", "index.d.ts", "JQuery.d.ts"])
    },
    async allReferencedFilesFromTestIncludesSecondaryTripleSlashTypes() {
        const m = await allReferencedFiles(["globby-tests.ts", "other-tests.ts"], fs.subDir("types").subDir("globby"), "globby", "types/globby", "ts")
        expect(Array.from(m.keys())).toEqual(["globby-tests.ts", "other-tests.ts", "index.d.ts", "merges.d.ts", "sneaky.d.ts"])
    },
    async getModuleInfoWorks() {
        const m = await getModuleInfo("boring", "types/boring", ["index.d.ts", "secondary.d.ts", "tertiary.d.ts", "commonjs.d.ts"], fs.subDir("types").subDir("boring"));
        expect(m.dependencies).toEqual(new Set(['react', 'react-default', 'things', 'vorticon']));
    },
    // TODO: For boring,gettypedataForSingleTypesVersion should start with tsconfig="index.d.ts", "boring-tests.ts" and
    // find all the used types files: "index.d.ts", "secondary", "tertiary", "commonjs"
    // TODO: GetTestDependencies should be checkTestDep and needs to be refactored similar to getModuleInfo to take a list of used files

    // allReferencedFiles -> { usedTypeFiles, usedTestFiles }
    // getModuleInfo :: usedTypeFiles -> { declFiles: usedTypeFiles, dependencies, declaredModules, globals } (the last two don't change)
    // getTestDep :: usedTestFiles -> testDependencies I guess?

    // entryFilesFromTsConfig is not needed anymore (maybe)


    // NOTE: getTypingInfo is the actual entry point, not getTypeDataForSingleTypesVersion x_x
})
