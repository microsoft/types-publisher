import { FS } from "../get-definitely-typed";
import { TypingsVersionsRaw } from "./packages";
/** @param fs Rooted at the package's directory, e.g. `DefinitelyTyped/types/abs` */
export declare function getTypingInfo(packageName: string, fs: FS): TypingsVersionsRaw;
export declare function parseMajorVersionFromDirectoryName(directoryName: string): number | undefined;
export declare function readFileAndThrowOnBOM(fileName: string, fs: FS): string;
