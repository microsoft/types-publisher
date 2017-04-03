"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fsp = require("fs-promise");
const yargs = require("yargs");
const common_1 = require("../lib/common");
const packages_1 = require("../lib/packages");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const get_affected_packages_1 = require("./get-affected-packages");
if (!module.parent) {
    const regexp = yargs.argv.all ? new RegExp("") : yargs.argv._[0] && new RegExp(yargs.argv._[0]);
    util_1.done(main(testerOptions(!!yargs.argv.runFromDefinitelyTyped), parseNProcesses(), regexp));
}
const pathToDtsLint = util_1.joinPaths(__dirname, "..", "..", "node_modules", "dtslint", "bin", "index.js");
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
        return new common_1.Options(process.cwd(), false);
    }
    else {
        return common_1.Options.defaults;
    }
}
exports.testerOptions = testerOptions;
function main(options, nProcesses, regexp) {
    return __awaiter(this, void 0, void 0, function* () {
        const allPackages = yield packages_1.AllPackages.read(options);
        const typings = regexp
            ? allPackages.allTypings().filter(t => regexp.test(t.name))
            : yield get_affected_packages_1.default(allPackages, console.log, options);
        nProcesses = nProcesses || util_1.numberOfOsProcesses;
        console.log(`Testing ${typings.length} packages: ${typings.map(t => t.desc)}`);
        console.log(`Running with ${nProcesses} processes.`);
        const allErrors = [];
        console.log("Installing NPM dependencies...");
        // We need to run `npm install` for all dependencies, too, so that we have dependencies' dependencies installed.
        yield util_1.nAtATime(nProcesses, get_affected_packages_1.allDependencies(allPackages, typings), (pkg) => __awaiter(this, void 0, void 0, function* () {
            const cwd = pkg.directoryPath(options);
            if (yield fsp.exists(util_1.joinPaths(cwd, "package.json"))) {
                // Scripts may try to compile native code.
                // This doesn't work reliably on travis, and we're just installing for the types, so ignore.
                let stdout = yield util_1.execAndThrowErrors(`npm install --ignore-scripts`, cwd);
                stdout = stdout.replace(/npm WARN \S+ No (description|repository field\.|license field\.)\n?/g, "");
                if (stdout) {
                    console.log(stdout);
                }
            }
        }));
        yield runCommand(console, undefined, pathToDtsLint, "--installAll");
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
            console.error(`The following packages had errors: ${allErrors.map(e => e.pkg.name).join(", ")}`);
            throw new Error("There was a test failure.");
        }
    });
}
exports.default = main;
function single(pkg, log, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const cwd = pkg.directoryPath(options);
        const shouldLint = yield fsp.exists(util_1.joinPaths(cwd, "tslint.json"));
        return runCommand(log, cwd, pathToDtsLint, "--dt", ...(shouldLint ? [] : ["--noLint"]));
    });
}
function runCommand(log, cwd, cmd, ...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const nodeCmd = `node ${cmd} ${args.join(" ")}`;
        log.info(`Running: ${nodeCmd}`);
        try {
            const { error, stdout, stderr } = yield util_1.exec(nodeCmd, cwd);
            if (stdout) {
                log.info(stdout);
            }
            if (stderr) {
                log.error(stderr);
            }
            return error && { message: `${error.message}\n${stdout}\n${stderr}` };
        }
        catch (e) {
            return e;
        }
    });
}
//# sourceMappingURL=test-runner.js.map