"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
function listen(dirPath) {
    process.on("message", (message) => {
        const { path, onlyTestTsNext, expectOnly } = message;
        require.resolve("dtslint");
        const cmd = `node ${require.resolve("dtslint")} ${onlyTestTsNext ? "--onlyTestTsNext" : ""} ${expectOnly ? "--expectOnly" : ""} ${path}`;
        cp.exec(cmd, { cwd: dirPath }, err => {
            if (err)
                process.send({ path, status: err.message });
            else
                process.send({ path, status: "OK" });
        });
    });
}
listen(process.cwd());
//# sourceMappingURL=test-runner-runner.js.map