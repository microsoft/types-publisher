import { TypingsVersionsRaw } from "./packages";
export declare const definitionParserWorkerFilename: string;
export interface DefinitionParserWorkerArgs {
    readonly packageName: string;
    readonly typesPath: string;
}
export interface TypingInfoWithPackageName {
    readonly data: TypingsVersionsRaw;
    readonly packageName: string;
}
