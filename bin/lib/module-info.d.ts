import * as ts from "typescript";
import { FS } from "../get-definitely-typed";
export declare function getModuleInfo(packageName: string, all: Map<string, ts.SourceFile>): ModuleInfo;
interface ModuleInfo {
    dependencies: Set<string>;
    declaredModules: string[];
    globals: string[];
}
/** Returns a map from filename (path relative to `directory`) to the SourceFile we parsed for it. */
export declare function allReferencedFiles(entryFilenames: ReadonlyArray<string>, fs: FS, packageName: string, baseDirectory: string): {
    types: Map<string, ts.SourceFile>;
    tests: Map<string, ts.SourceFile>;
};
export declare function getTestDependencies(packageName: string, typeFiles: Map<string, unknown>, testFiles: Iterable<string>, dependencies: ReadonlySet<string>, fs: FS): Iterable<string>;
export declare function createSourceFile(filename: string, content: string): ts.SourceFile;
export {};
