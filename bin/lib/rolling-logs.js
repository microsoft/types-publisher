"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const azure_container_1 = require("./azure-container");
class RollingLogs {
    constructor(name, maxLines, container) {
        this.name = name;
        this.maxLines = maxLines;
        this.container = container;
    }
    static create(name, maxLines) {
        return __awaiter(this, void 0, void 0, function* () {
            return new RollingLogs(name, maxLines, yield azure_container_1.default.create());
        });
    }
    write(lines) {
        return __awaiter(this, void 0, void 0, function* () {
            const logs = this.allLogs || (this.allLogs = yield this.readAllLogs());
            const totalLines = logs.length + lines.length;
            logs.splice(0, totalLines - this.maxLines);
            logs.push(...lines);
            yield this.container.createBlobFromText(this.name, logs.join("\n"));
        });
    }
    readAllLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return (yield azure_container_1.readBlob(this.name)).split("\n");
            }
            catch (err) {
                // 404
                return [];
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RollingLogs;
//# sourceMappingURL=rolling-logs.js.map