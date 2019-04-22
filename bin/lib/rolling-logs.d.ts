import BlobWriter from "./azure-container";
export default class RollingLogs {
    readonly name: string;
    readonly maxLines: number;
    private readonly container;
    static create(name: string, maxLines: number): Promise<RollingLogs>;
    private allLogs;
    constructor(name: string, maxLines: number, container: BlobWriter);
    write(lines: string[]): Promise<void>;
    private readAllLogs;
}
