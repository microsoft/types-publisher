"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fsp = require("fs-promise");
const path = require("path");
const yargs = require("yargs");
const common_1 = require("../lib/common");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const get_affected_packages_1 = require("./get-affected-packages");
const tscPath = path.join(require.resolve("typescript"), "../tsc.js");
const tslintPath = path.join(require.resolve("tslint"), "../tslint-cli.js");
if (!module.parent) {
    if (!common_1.existsTypesDataFileSync()) {
        console.log("Run parse-definitions first!");
    }
    else {
        const regexp = yargs.argv.all ? new RegExp("") : yargs.argv._[0] && new RegExp(yargs.argv._[0]);
        util_1.done(main(testerOptions(!!yargs.argv.runFromDefinitelyTyped), parseNProcesses(), regexp));
    }
}
function parseNProcesses() {
    const str = yargs.argv.nProcesses;
    if (!str) {
        return undefined;
    }
    const nProcesses = Number.parseInt(yargs.argv.nProcesses, 10);
    if (Number.isNaN(nProcesses)) {
        throw new Error("Expected nProcesses to be a number.");
    }
    return nProcesses;
}
exports.parseNProcesses = parseNProcesses;
function testerOptions(runFromDefinitelyTyped) {
    if (runFromDefinitelyTyped) {
        return { definitelyTypedPath: process.cwd() };
    }
    else {
        return common_1.Options.defaults;
    }
}
exports.testerOptions = testerOptions;
function main(options, nProcesses, regexp) {
    return __awaiter(this, void 0, void 0, function* () {
        const typings = regexp
            ? (yield common_1.readTypings()).filter(t => regexp.test(t.typingsPackageName))
            : yield get_affected_packages_1.default(console.log, options);
        nProcesses = nProcesses || util_1.numberOfOsProcesses;
        console.log(`Testing ${typings.length} packages: ${typings.map(t => t.typingsPackageName)}`);
        console.log(`Running with ${nProcesses} processes.`);
        const allErrors = [];
        console.log("Installing dependencies...");
        yield util_1.nAtATime(nProcesses, typings, (pkg) => __awaiter(this, void 0, void 0, function* () {
            const cwd = common_1.packagePath(pkg, options);
            if (yield fsp.exists(path.join(cwd, "package.json"))) {
                let stdout = yield util_1.execAndThrowErrors(`npm install`, cwd);
                stdout = stdout.replace(/npm WARN \S+ No (description|repository field\.|license field\.)\n?/g, "");
                if (stdout) {
                    console.log(stdout);
                }
            }
        }));
        console.log("Testing...");
        yield util_1.nAtATime(nProcesses, typings, (pkg) => __awaiter(this, void 0, void 0, function* () {
            const [log, logResult] = logging_1.quietLoggerWithErrors();
            const err = yield single(pkg, log, options);
            console.log(`Testing ${pkg.typingsPackageName}`);
            logging_1.moveLogsWithErrors(console, logResult(), msg => "\t" + msg);
            if (err) {
                allErrors.push({ err, pkg });
            }
        }));
        if (allErrors.length) {
            allErrors.sort(({ pkg: pkgA }, { pkg: pkgB }) => pkgA.typingsPackageName.localeCompare(pkgB.typingsPackageName));
            console.log("\n\n=== ERRORS ===\n");
            for (const { err, pkg } of allErrors) {
                console.error(`Error in ${pkg.typingsPackageName}`);
                console.error(err.message);
            }
            throw new Error("There was a test failure.");
        }
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function single(pkg, log, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const cwd = common_1.packagePath(pkg, options);
        return (yield tsConfig()) || (yield tsc()) || (yield tslint());
        function tsConfig() {
            return __awaiter(this, void 0, void 0, function* () {
                const tsconfigPath = path.join(cwd, "tsconfig.json");
                try {
                    checkTsconfig(yield io_1.readJson(tsconfigPath));
                }
                catch (error) {
                    log.error(error.message);
                    return { message: error.message };
                }
                return undefined;
            });
        }
        function tsc() {
            return runCommand(log, cwd, tscPath);
        }
        function tslint() {
            return __awaiter(this, void 0, void 0, function* () {
                return (yield fsp.exists(path.join(cwd, "tslint.json")))
                    ? runCommand(log, cwd, tslintPath, "--format stylish", ...pkg.files)
                    : undefined;
            });
        }
    });
}
function runCommand(log, cwd, cmd, ...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const nodeCmd = `node ${cmd} ${args.join(" ")}`;
        log.info(`Running: ${nodeCmd}`);
        const { error, stdout, stderr } = yield util_1.exec(nodeCmd, cwd);
        if (stdout) {
            log.info(stdout);
        }
        if (stderr) {
            log.error(stderr);
        }
        return error && { message: `${error.message}\n${stdout}\n${stderr}` };
    });
}
function checkTsconfig(tsconfig) {
    const options = tsconfig.compilerOptions;
    const mustHave = {
        module: "commonjs",
        // target: "es6", // Some libraries use an ES5 target, such as es6-shim
        noEmit: true,
        forceConsistentCasingInFileNames: true
    };
    for (const [key, value] of Object.entries(mustHave)) {
        if (options[key] !== value) {
            throw new Error(`Expected compilerOptions[${JSON.stringify(key)}] === ${value}`);
        }
    }
    if (!("noImplicitAny" in options && "strictNullChecks" in options)) {
        throw new Error(`Expected compilerOptions["noImplicitAny"] and compilerOptions["strictNullChecks"] to exist`);
    }
    // baseUrl / typeRoots / types may be missing.
}
//# sourceMappingURL=test-runner.js.map