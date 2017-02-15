import * as fsp from "fs-promise";
import { Linter, ILinterOptions } from "tslint";
import * as Lint from "tslint";

import { Options } from "../lib/common";
import { AllPackages } from "../lib/packages";
import { done, joinPaths } from "../util/util";

if (!module.parent) {
    const name = process.argv[2];
    if (!name) throw new Error("!");
    done(main(name, Options.defaults));
}

//Difference with tslint:
//* We don't crash on compile error.
//* We don't skip declaration files.
async function main(name: string, options: Options) {
    const pkg = await AllPackages.readSingle(name);
    const program = Linter.createProgram(pkg.filePath("tsconfig.json", options)); //optional project directory?

    const lintOptions: ILinterOptions = {
        fix: false,
        formatter: "stylish",
        rulesDirectory: joinPaths(__dirname, "..", "tslint")
    }
    const linter = new Linter(lintOptions, program);
    const config = Lint.Configuration.findConfiguration(pkg.filePath("tslint.json", options), "").results; //Second param doesn't matter, since config path is provided.
    //tslint's `getFileNames` refuses to lint declaration files.

    for (const file of pkg.files.concat(pkg.testFiles)) {
        const f = pkg.filePath(file, options)
        const contents = await fsp.readFile(f, "utf-8");
        linter.lint(f, contents, config);
    }

    const result = linter.getResult();
    (result.failureCount ? console.error : console.log)(result.output);
}
