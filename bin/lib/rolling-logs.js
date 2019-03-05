"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const azure_container_1 = require("./azure-container");
class RollingLogs {
    constructor(name, maxLines, container) {
        this.name = name;
        this.maxLines = maxLines;
        this.container = container;
    }
    static async create(name, maxLines) {
        return new RollingLogs(name, maxLines, await azure_container_1.default.create());
    }
    async write(lines) {
        const logs = this.allLogs || (this.allLogs = await this.readAllLogs());
        const totalLines = logs.length + lines.length;
        logs.splice(0, totalLines - this.maxLines);
        logs.push(...lines);
        await this.container.createBlobFromText(this.name, logs.join("\n"));
    }
    async readAllLogs() {
        try {
            return (await azure_container_1.readBlob(this.name)).split("\n");
        }
        catch (err) {
            // 404
            return [];
        }
    }
}
exports.default = RollingLogs;
//# sourceMappingURL=rolling-logs.js.map