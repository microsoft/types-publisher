import { Dir, FS } from "./get-definitely-typed";
declare class DTMock {
    readonly fs: FS;
    private readonly root;
    constructor();
    pkgDir(packageName: string): Dir;
    pkgFS(packageName: string): FS;
    /**
     * Creates a shallow copy of a package, meaning all entries in the old version directory that will be created refer to the copied entry from the
     * latest version. The only exceptions are the `index.d.ts` and `tsconfig.json` files.
     *
     * The directory name will exactly follow the given `olderVersion`. I.e. `2` will become `v2`, whereas `2.2` will become `v2.2`.
     *
     * @param packageName The package of which an old version is to be added.
     * @param olderVersion The older version that's to be added.
     */
    addOldVersionOfPackage(packageName: string, olderVersion: string): Dir;
}
export declare function createMockDT(): DTMock;
export {};
