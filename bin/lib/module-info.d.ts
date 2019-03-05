import { FS } from "../get-definitely-typed";
export default function getModuleInfo(packageName: string, packageDirectory: string, allEntryFilenames: ReadonlyArray<string>, fs: FS): Promise<ModuleInfo>;
interface ModuleInfo {
    declFiles: string[];
    dependencies: Set<string>;
    declaredModules: string[];
    globals: string[];
}
export declare function getTestDependencies(pkgName: string, testFiles: Iterable<string>, dependencies: ReadonlySet<string>, fs: FS): Promise<Iterable<string>>;
export {};
