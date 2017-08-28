"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const charm = require("charm");
class ProgressBar {
    constructor(options) {
        this.console = new UpdatableConsole();
        /** Most recent flavor text. */
        this.flavor = "";
        this.lastUpdateMillis = 0;
        this.name = options.name;
        this.width = options.width === undefined ? 20 : options.width;
        this.updateMinTime = options.updateMinTime === undefined ? 250 : options.updateMinTime;
    }
    update(current, flavor) {
        if (flavor !== undefined) {
            this.flavor = flavor;
        }
        const now = +(new Date());
        const diff = now - this.lastUpdateMillis;
        if (diff > this.updateMinTime) {
            this.lastUpdateMillis = now;
            this.doUpdate(current);
        }
    }
    doUpdate(current) {
        const nCellsFilled = Math.ceil(this.width * Math.min(1, Math.max(0, current)));
        this.console.update(charm => {
            charm.write(this.name);
            charm.write(" [");
            charm.write("█".repeat(nCellsFilled));
            if (nCellsFilled < this.width) {
                charm.right(this.width - nCellsFilled);
            }
            charm.write("]");
            if (this.flavor.length) {
                charm.write(` ${this.flavor}`);
            }
        });
    }
    done() {
        this.flavor = "Done!";
        this.doUpdate(1);
        this.console.end();
    }
}
exports.default = ProgressBar;
/** A mutable line of text on the console. */
class UpdatableConsole {
    constructor() {
        this.charm = charm(process.stdout);
    }
    update(action) {
        this.charm.push();
        this.charm.erase("line");
        action(this.charm);
        this.charm.pop();
    }
    end() {
        this.charm.write("\n");
        this.charm.end();
    }
}
const firstLetter = "a".charCodeAt(0);
const lastLetter = "z".charCodeAt(0);
const charWidth = lastLetter - firstLetter;
const strProgressTotal = charWidth * charWidth; // 2 characters
/** Tracks a string's progress through the alphabet. */
function strProgress(str) {
    const x = charProgress(str.charCodeAt(0)) * charWidth + charProgress(str.charCodeAt(1));
    return x / strProgressTotal;
    function charProgress(ch) {
        if (Number.isNaN(ch) || ch <= firstLetter) {
            return 0;
        }
        if (ch >= lastLetter) {
            return charWidth;
        }
        return ch - firstLetter;
    }
}
exports.strProgress = strProgress;
//# sourceMappingURL=progress.js.map