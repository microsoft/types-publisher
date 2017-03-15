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
const yargs = require("yargs");
const common_1 = require("../lib/common");
const packages_1 = require("../lib/packages");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const get_affected_packages_1 = require("./get-affected-packages");
const ts_installer_1 = require("./ts-installer");
const tslintPath = util_1.joinPaths(require.resolve("tslint"), "../tslint-cli.js");
if (!module.parent) {
    const regexp = yargs.argv.all ? new RegExp("") : yargs.argv._[0] && new RegExp(yargs.argv._[0]);
    util_1.done(main(testerOptions(!!yargs.argv.runFromDefinitelyTyped), parseNProcesses(), regexp));
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
        return { definitelyTypedPath: process.cwd(), progress: false };
    }
    else {
        return common_1.Options.defaults;
    }
}
exports.testerOptions = testerOptions;
function main(options, nProcesses, regexp) {
    return __awaiter(this, void 0, void 0, function* () {
        yield ts_installer_1.installAllTypeScriptVersions();
        const allPackages = yield packages_1.AllPackages.read(options);
        const typings = regexp
            ? allPackages.allTypings().filter(t => regexp.test(t.name))
            : yield get_affected_packages_1.default(allPackages, console.log, options);
        nProcesses = nProcesses || util_1.numberOfOsProcesses;
        console.log(`Testing ${typings.length} packages: ${typings.map(t => t.desc)}`);
        console.log(`Running with ${nProcesses} processes.`);
        const allErrors = [];
        console.log("Installing dependencies...");
        yield util_1.nAtATime(nProcesses, typings, (pkg) => __awaiter(this, void 0, void 0, function* () {
            const cwd = pkg.directoryPath(options);
            if (yield fsp.exists(util_1.joinPaths(cwd, "package.json"))) {
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
            console.log(`Testing ${pkg.desc}`);
            logging_1.moveLogsWithErrors(console, logResult(), msg => "\t" + msg);
            if (err) {
                allErrors.push({ err, pkg });
            }
        }));
        if (allErrors.length) {
            allErrors.sort(({ pkg: pkgA }, { pkg: pkgB }) => packages_1.PackageBase.compare(pkgA, pkgB));
            console.log("\n\n=== ERRORS ===\n");
            for (const { err, pkg } of allErrors) {
                console.error(`\n\nError in ${pkg.desc}`);
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
        const cwd = pkg.directoryPath(options);
        return (yield tsConfig()) || (yield packageJson()) || (yield tsc()) || (yield tslint());
        function tsConfig() {
            return __awaiter(this, void 0, void 0, function* () {
                const tsconfigPath = util_1.joinPaths(cwd, "tsconfig.json");
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
                if (error && pkg.typeScriptVersion !== packages_1.TypeScriptVersion.Latest) {
                    const newError = yield runCommand(log, cwd, ts_installer_1.pathToTsc(packages_1.TypeScriptVersion.Latest));
                    if (!newError) {
                        const message = `${error.message}\n` +
                            `Package compiles in TypeScript ${packages_1.TypeScriptVersion.Latest} but not in ${pkg.typeScriptVersion}.\n` +
                            `You can add a line '// TypeScript Version: ${packages_1.TypeScriptVersion.Latest}' to the end of the header to specify a new compiler version.`;
                        return { message };
                    }
                }
                return error;
            });
        }
        function tslint() {
            return __awaiter(this, void 0, void 0, function* () {
                return (yield fsp.exists(util_1.joinPaths(cwd, "tslint.json")))
                    ? runCommand(log, cwd, tslintPath, "--format stylish", ...pkg.files, ...pkg.testFiles)
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
    if (!("lib" in options)) {
        throw new Error('Must specify "lib", usually to `"lib": ["es6"]` or `"lib": ["es6", "dom"]`.');
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
        const pkgJsonPath = typing.filePath("package.json", options);
        const pkgJson = yield io_1.readJson(pkgJsonPath);
        const ignoredField = Object.keys(pkgJson).find(field => !["dependencies", "peerDependencies", "description"].includes(field));
        if (ignoredField) {
            throw new Error(`Ignored field in ${pkgJsonPath}: ${ignoredField}`);
        }
    });
}
//# sourceMappingURL=test-runner.js.map