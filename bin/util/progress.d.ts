export interface Options {
    /** Text to display in front of the progress bar. */
    name: string;
    /** Length of the progress bar. */
    width?: number;
    /** Only render an update if this many milliseconds have passed. */
    updateMinTime?: number;
}
export default class ProgressBar {
    private readonly console;
    private readonly name;
    private readonly width;
    private readonly updateMinTime;
    /** Most recent flavor text. */
    private flavor;
    private lastUpdateMillis;
    constructor(options: Options);
    update(current: number, flavor?: string): void;
    private doUpdate;
    done(): void;
}
/** Tracks a string's progress through the alphabet. */
export declare function strProgress(str: string): number;
