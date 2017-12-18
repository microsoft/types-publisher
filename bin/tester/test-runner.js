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
const fs_extra_1 = require("fs-extra");
const yargs = require("yargs");
const common_1 = require("../lib/common");
const packages_1 = require("../lib/packages");
const io_1 = require("../util/io");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
const get_affected_packages_1 = require("./get-affected-packages");
if (!module.parent) {
    const selection = yargs.argv.all ? "all" : yargs.argv._[0] ? new RegExp(yargs.argv._[0]) : "affected";
    util_1.done(main(testerOptions(!!yargs.argv.runFromDefinitelyTyped), parseNProcesses(), selection));
}
const pathToDtsLint = require.resolve("dtslint");
function parseNProcesses() {
    const str = yargs.argv.nProcesses;
    if (!str) {
        return util_1.numberOfOsProcesses;
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
        return new common_1.Options(process.cwd(), /*resetDefinitelyTyped*/ false, /*progress*/ false);
    }
    else {
        return common_1.Options.defaults;
    }
}
exports.testerOptions = testerOptions;
function main(options, nProcesses, selection) {
    return __awaiter(this, void 0, void 0, function* () {
        const allPackages = yield packages_1.AllPackages.read(options);
        const { changedPackages, dependentPackages } = selection === "all"
            ? { changedPackages: allPackages.allTypings(), dependentPackages: [] }
            : selection === "affected"
                ? yield get_affected_packages_1.default(allPackages, logging_1.consoleLogger.info, options)
                : { changedPackages: allPackages.allTypings().filter(t => selection.test(t.name)), dependentPackages: [] };
        console.log(`Testing ${changedPackages.length} changed packages: ${changedPackages.map(t => t.desc)}`);
        console.log(`Testing ${dependentPackages.length} dependent packages: ${dependentPackages.map(t => t.desc)}`);
        console.log(`Running with ${nProcesses} processes.`);
        const allErrors = [];
        console.log("Installing NPM dependencies...");
        // We need to run `npm install` for all dependencies, too, so that we have dependencies' dependencies installed.
        yield util_1.nAtATime(nProcesses, get_affected_packages_1.allDependencies(allPackages, util_1.concat(changedPackages, dependentPackages)), (pkg) => __awaiter(this, void 0, void 0, function* () {
            const cwd = pkg.directoryPath(options);
            if (!(yield fs_extra_1.pathExists(util_1.joinPaths(cwd, "package.json")))) {
                return;
            }
            // Scripts may try to compile native code.
            // This doesn't work reliably on travis, and we're just installing for the types, so ignore.
            const cmd = `npm install ${io_1.npmInstallFlags}`;
            console.log(`  ${cwd}: ${cmd}`);
            const stdout = yield util_1.execAndThrowErrors(cmd, cwd);
            if (stdout) {
                // Must specify what this is for since these run in parallel.
                console.log(` from ${cwd}: ${stdout}`);
            }
        }));
        yield runCommand(console, undefined, pathToDtsLint, ["--installAll"]);
        console.log("Testing...");
        yield runTests(changedPackages, false);
        yield runTests(dependentPackages, true);
        if (allErrors.length) {
            allErrors.sort(({ pkg: pkgA }, { pkg: pkgB }) => packages_1.PackageBase.compare(pkgA, pkgB));
            console.log("\n\n=== ERRORS ===\n");
            for (const { err, pkg } of allErrors) {
                console.error(`\n\nError in ${pkg.desc}`);
                console.error(err.message);
            }
            console.error(`The following packages had errors: ${allErrors.map(e => e.pkg.desc).join(", ")}`);
            throw new Error("There was a test failure.");
        }
        function runTests(packages, isDepender) {
            return __awaiter(this, void 0, void 0, function* () {
                yield util_1.nAtATime(nProcesses, packages, pkg => runTest(pkg, isDepender));
            });
        }
        function runTest(pkg, isDepender) {
            return __awaiter(this, void 0, void 0, function* () {
                const [log, logResult] = logging_1.quietLoggerWithErrors();
                const err = yield runCommand(log, pkg.directoryPath(options), pathToDtsLint, isDepender ? ["--onlyTestTsNext"] : []);
                console.log(`Testing ${pkg.desc}`);
                logging_1.moveLogsWithErrors(console, logResult(), msg => `\t${msg}`);
                if (err) {
                    allErrors.push({ err, pkg });
                }
            });
        }
    });
}
exports.default = main;
function runCommand(log, cwd, cmd, args) {
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