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
const rimraf = require("rimraf");
const yargs = require("yargs");
const util_1 = require("./lib/util");
const common_1 = require("./lib/common");
if (!module.parent) {
    const packageNames = yargs.argv._;
    main(packageNames);
}
function main(packageNames) {
    return __awaiter(this, void 0, void 0, function* () {
        const log = new common_1.ArrayLog();
        if (!packageNames || !packageNames.length) {
            console.info("Validating all packages");
            packageNames = common_1.readTypings().map(t => t.typingsPackageName).sort();
        }
        else {
            console.info("Validating: " + JSON.stringify(packageNames));
        }
        yield validatePackages(packageNames, common_1.settings.validateOutputPath, log);
        const { infos, errors } = log.result();
        common_1.writeLogSync("validate.md", infos);
        common_1.writeLogSync("validate-errors.md", errors);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function validatePackages(packageNames, outPath, log) {
    return __awaiter(this, void 0, void 0, function* () {
        log.info("");
        log.info("Using output path: " + outPath);
        log.info("Running tests....");
        log.info("");
        const failed = [];
        const passed = [];
        try {
            // Refresh the output folder
            if (yield fsp.exists(outPath)) {
                yield deleteDirectory(outPath, log);
            }
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
        const log = new common_1.ArrayLog();
        let passed = false;
        try {
            const packageDirectory = path.join(outputDirecory, packageName);
            log.info("");
            log.info("Processing `" + packageName + "`...");
            yield fsp.mkdirp(packageDirectory);
            yield writePackage(packageDirectory, packageName);
            if ((yield runCommand("npm", log, packageDirectory, "npm install")) &&
                (yield runCommand("tsc", log, packageDirectory, "tsc"))) {
                yield deleteDirectory(packageDirectory, log);
                log.info("Passed.");
                passed = true;
            }
        }
        catch (e) {
            log.info("Error: " + e);
            log.info("Failed!");
        }
        // Write the log as one entry to the main log
        mergeLogs(mainLog, log);
        console.info(`${packageName} -- ${passed ? "Passed" : "Failed"}.`);
        return passed;
    });
}
function mergeLogs(log1, log2) {
    const { infos, errors } = log2.result();
    for (const info of infos) {
        log1.info(info);
    }
    for (const error of errors) {
        log1.error(error);
    }
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
function runCommand(commandDescription, log, directory, ...args) {
    const cmd = args.join(" ");
    log.info(`Run ${cmd}`);
    return new Promise((resolve, reject) => {
        child_process.exec(cmd, { encoding: "utf8", cwd: directory }, (err, stdoutBuffer, stderrBuffer) => {
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
function deleteDirectory(path, log) {
    return new Promise((resolve, reject) => {
        rimraf(path, err => {
            if (err) {
                log.error(`rimraf failed: ${JSON.stringify(err)}`);
                log.info(`rimraf failed, refer to error log`);
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}
//# sourceMappingURL=validate.js.map