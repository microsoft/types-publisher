"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
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
const ts_installer_1 = require("./ts-installer");
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
        yield ts_installer_1.installAllTypeScriptVersions();
        const typings = regexp
            ? (yield common_1.readTypings()).filter(t => regexp.test(t.typingsPackageName))
            : yield get_affected_packages_1.default(console.log, options);
        nProcesses = nProcesses || util_1.numberOfOsProcesses;
        console.log(`Testing ${typings.length} packages: ${typings.map(t => t.typingsPackageName)}`);
        console.log(`Running with ${nProcesses} processes.`);
        const allErrors = [];
        console.log("Installing dependencies...");
        yield util_1.nAtATime(nProcesses, get_affected_packages_1.allDependencies(typings), (packageName) => __awaiter(this, void 0, void 0, function* () {
            const cwd = common_1.definitelyTypedPath(packageName, options);
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
        return (yield tsConfig()) || (yield packageJson()) || (yield tsc()) || (yield tslint());
        function tsConfig() {
            return __awaiter(this, void 0, void 0, function* () {
                const tsconfigPath = path.join(cwd, "tsconfig.json");
                return catchErrors(log, () => __awaiter(this, void 0, void 0, function* () { return checkTsconfig(yield io_1.readJson(tsconfigPath)); }));
            });
        }
        function packageJson() {
            return __awaiter(this, void 0, void 0, function* () {
                return catchErrors(log, () => checkPackageJson(pkg, options));
            });
        }
        function tsc() {
            return __awaiter(this, void 0, void 0, function* () {
                const error = yield runCommand(log, cwd, ts_installer_1.pathToTsc(pkg.typeScriptVersion));
                if (error && pkg.typeScriptVersion !== common_1.TypeScriptVersion.Latest) {
                    const newError = yield runCommand(log, cwd, ts_installer_1.pathToTsc(common_1.TypeScriptVersion.Latest));
                    if (!newError) {
                        const message = `${error.message}\n` +
                            `Package compiles in TypeScript ${common_1.TypeScriptVersion.Latest} but not in ${pkg.typeScriptVersion}.\n` +
                            `You can add a line '// TypeScript Version: ${common_1.TypeScriptVersion.Latest}' to the end of the header to specify a new compiler version.`;
                        return { message };
                    }
                }
                return error;
            });
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
function catchErrors(log, action) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield action();
        }
        catch (error) {
            log.error(error.message);
            return { message: error.message };
        }
        return undefined;
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
    for (const key of ["noImplicitAny", "noImplicitThis", "strictNullChecks"]) {
        if (!(key in options)) {
            throw new Error(`Expected \`"${key}": true\` or \`"${key}": false\`.`);
        }
    }
    if (("typeRoots" in options) && !("types" in options)) {
        throw new Error('If the "typeRoots" option is specified in your tsconfig, you must include `"types": []` to prevent very long compile times.');
    }
    // baseUrl / typeRoots / types may be missing.
    if (options.types && options.types.length) {
        throw new Error('Use `/// <reference types="..." />` directives in source files and ensure that the "types" field in your tsconfig is an empty array.');
    }
}
function checkPackageJson(typing, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!typing.hasPackageJson) {
            return;
        }
        const pkgPath = common_1.filePath(typing, "package.json", options);
        const pkg = yield io_1.readJson(pkgPath);
        const ignoredField = Object.keys(pkg).find(field => !["dependencies", "peerDependencies", "description"].includes(field));
        if (ignoredField) {
            throw new Error(`Ignored field in ${pkgPath}: ${ignoredField}`);
        }
    });
}
//# sourceMappingURL=test-runner.js.map