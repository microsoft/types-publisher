import { FS } from "../get-definitely-typed";
import { TypingsVersionsRaw, TypingVersion } from "./packages";
/** @param fs Rooted at the package's directory, e.g. `DefinitelyTyped/types/abs` */
export declare function getTypingInfo(packageName: string, fs: FS): TypingsVersionsRaw;
/**
 * Parses a directory name into a version that either holds a single major version or a major and minor version.
 *
 * @example
 *
 * ```ts
 * parseVersionFromDirectoryName("v1") // { major: 1 }
 * parseVersionFromDirectoryName("v0.61") // { major: 0, minor: 61 }
 * ```
 */
export declare function parseVersionFromDirectoryName(directoryName: string): TypingVersion | undefined;
export declare function readFileAndThrowOnBOM(fileName: string, fs: FS): string;
