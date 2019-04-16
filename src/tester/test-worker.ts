import cp = require("child_process");
process.on("message", (message: {}) => {
    const { path, onlyTestTsNext, expectOnly } = message as { path: string, onlyTestTsNext: boolean, expectOnly?: boolean };
    require.resolve("dtslint")
    const cmd = `node ${require.resolve("dtslint")} ${onlyTestTsNext ? "--onlyTestTsNext" : ""} ${expectOnly ? "--expectOnly" : ""} ${path}`
    cp.exec(cmd, { cwd: process.cwd() },
            err => {
                if (err)
                    process.send!({ path, status: err.message })
                else
                    process.send!({ path, status: "OK" })
            });
});
