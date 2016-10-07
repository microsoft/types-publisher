"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fsp = require("fs-promise");
const path = require("path");
const child_process = require("child_process");
const yargs = require("yargs");
const util_1 = require("./lib/util");
const common_1 = require("./lib/common");
const logging_1 = require("./lib/logging");
const util_2 = require("./lib/util");
const versions_1 = require("./lib/versions");
if (!module.parent) {
    if (!common_1.existsTypesDataFileSync()) {
        console.log("Run parse-definitions first!");
    }
    else {
        const all = !!yargs.argv.all;
        const packageNames = yargs.argv._;
        if (all && packageNames) {
            throw new Error("Can't combine --all with listed package names.");
        }
        if (all) {
            console.log("Validating all packages");
            util_2.done(doAll());
        }
        else if (packageNames.length) {
            console.log("Validating: " + JSON.stringify(packageNames));
            util_2.done(doValidate(packageNames));
        }
        else {
            main();
        }
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const changed = yield versions_1.changedPackages(yield common_1.readAllPackages());
        yield doValidate(changed.map(c => c.typingsPackageName));
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function doAll() {
    return __awaiter(this, void 0, void 0, function* () {
        const packageNames = (yield common_1.readTypings()).map(t => t.typingsPackageName).sort();
        yield doValidate(packageNames);
    });
}
function doValidate(packageNames) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.loggerWithErrors();
        yield validatePackages(packageNames, common_1.settings.validateOutputPath, log);
        const { infos, errors } = logResult();
        yield Promise.all([
            logging_1.writeLog("validate.md", infos),
            logging_1.writeLog("validate-errors.md", errors)
        ]);
    });
}
function validatePackages(packageNames, outPath, log) {
    return __awaiter(this, void 0, void 0, function* () {
        log.info("");
        log.info("Using output path: " + outPath);
        log.info("Running tests....");
        log.info("");
        const failed = [];
        const passed = [];
        try {
            yield fsp.remove(outPath);
            yield fsp.mkdirp(outPath);
        }
        catch (e) {
            log.error("Could not recreate output directory. " + e);
            return;
        }
        // Run the tests
        yield util_1.nAtATime(25, packageNames, (packageName) => __awaiter(this, void 0, void 0, function* () {
            if (yield validatePackage(packageName, outPath, log)) {
                passed.push(packageName);
            }
            else {
                failed.push(packageName);
            }
        }));
        // Write results
        log.info("");
        log.info("");
        log.info(`Total  ${packageNames.length}`);
        log.info(`Passed ${passed.length}`);
        log.info(`Failed ${failed.length}`);
        log.info("");
        log.info(`These packages failed: ${failed}`);
    });
}
function validatePackage(packageName, outputDirecory, mainLog) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLoggerWithErrors();
        let passed = false;
        try {
            const packageDirectory = path.join(outputDirecory, packageName);
            log.info("");
            log.info("Processing `" + packageName + "`...");
            yield fsp.mkdirp(packageDirectory);
            yield writePackage(packageDirectory, packageName);
            if ((yield runCommand("npm", log, packageDirectory, "../../node_modules/npm/bin/npm-cli.js", "install")) &&
                (yield runCommand("tsc", log, packageDirectory, "../../node_modules/typescript/lib/tsc.js"))) {
                yield fsp.remove(packageDirectory);
                log.info("Passed.");
                passed = true;
            }
        }
        catch (e) {
            log.info("Error: " + e);
            log.info("Failed!");
        }
        // Write the log as one entry to the main log
        logging_1.moveLogsWithErrors(mainLog, logResult());
        console.info(`${packageName} -- ${passed ? "Passed" : "Failed"}.`);
        return passed;
    });
}
function writePackage(packageDirectory, packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        // Write package.json
        yield util_1.writeJson(path.join(packageDirectory, "package.json"), {
            name: `${packageName}_test`,
            version: "1.0.0",
            description: "test",
            author: "",
            license: "ISC",
            repository: "https://github.com/Microsoft/types-publisher",
            dependencies: { [`@types/${packageName}`]: common_1.settings.tag }
        });
        // Write tsconfig.json
        yield util_1.writeJson(path.join(packageDirectory, "tsconfig.json"), {
            compilerOptions: {
                module: "commonjs",
                target: "es5",
                noImplicitAny: false,
                strictNullChecks: false,
                noEmit: true,
                lib: ["es5", "es2015.promise", "dom"]
            }
        });
        // Write index.ts
        yield util_1.writeFile(path.join(packageDirectory, "index.ts"), `/// <reference types="${packageName}" />\r\n`);
    });
}
// Returns whether the command succeeded.
function runCommand(commandDescription, log, directory, cmd, ...args) {
    const nodeCmd = `node ${cmd} ${args.join(" ")}`;
    log.info(`Run ${nodeCmd}`);
    return new Promise(resolve => {
        child_process.exec(nodeCmd, { encoding: "utf8", cwd: directory }, (err, stdoutBuffer, stderrBuffer) => {
            // These are wrongly typed as Buffer.
            const stdout = stdoutBuffer;
            const stderr = stderrBuffer;
            if (err) {
                log.error(stderr);
                log.info(stdout);
                log.error(`${commandDescription} failed: ${JSON.stringify(err)}`);
                log.info(`${commandDescription} failed, refer to error log`);
                resolve(false);
            }
            else {
                log.info(stdout);
                resolve(true);
            }
        });
    });
}
//# sourceMappingURL=validate.js.map