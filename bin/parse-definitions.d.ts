import { FS } from "./get-definitely-typed";
import { AllPackages } from "./lib/packages";
import { LoggerWithErrors } from "./util/logging";
export interface ParallelOptions {
    readonly nProcesses: number;
    readonly definitelyTypedPath: string;
}
export default function parseDefinitions(dt: FS, parallel: ParallelOptions | undefined, log: LoggerWithErrors): Promise<AllPackages>;
