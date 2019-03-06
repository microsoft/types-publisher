import { FS } from "../get-definitely-typed";
import { TesterOptions } from "../lib/common";
export declare function parseNProcesses(): number;
export declare function testerOptions(runFromDefinitelyTyped: boolean): TesterOptions;
export default function runTests(dt: FS, definitelyTypedPath: string, nProcesses: number, selection: "all" | "affected" | RegExp): Promise<void>;
