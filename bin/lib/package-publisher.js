"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require("assert");
const common_1 = require("./common");
const logging_1 = require("./logging");
const util_1 = require("./util");
const fetch = require("node-fetch");
const path = require("path");
const child_process = require("child_process");
function publishPackage(client, pkg, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        const name = pkg.typingsPackageName;
        log(`Publishing ${name}`);
        const packageDir = path.join("output", name);
        const packageJson = yield util_1.readJson(path.join(packageDir, "package.json"));
        const version = packageJson.version;
        assert(typeof version === "string");
        yield client.publish(packageDir, packageJson, dry);
        if (common_1.settings.tag && common_1.settings.tag !== "latest" && !dry) {
            yield client.tag(name, version, common_1.settings.tag);
        }
        if (common_1.isNotNeededPackage(pkg)) {
            log(`Deprecating ${name}`);
            // Don't use a newline in the deprecation message because it will be displayed as "\n" and not as a newline.
            const message = common_1.notNeededReadme(pkg, /*useNewline*/ false);
            if (!dry) {
                yield client.deprecate(common_1.fullPackageName(name), version, message);
            }
        }
        return logResult();
    });
}
exports.publishPackage = publishPackage;
// Used for testing only.
function unpublishPackage(pkg, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = common_1.fullPackageName(pkg.typingsPackageName);
        const args = ["npm", "unpublish", name, "--force"];
        yield runCommand("Unpublish", logging_1.consoleLogger, dry, args);
    });
}
exports.unpublishPackage = unpublishPackage;
function shouldPublish(pkg) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLoggerWithErrors();
        const outputPath = common_1.getOutputPath(pkg);
        // Read package.json for version number we would be publishing
        const packageJson = yield util_1.readJson(path.join(outputPath, "package.json"));
        const localVersion = packageJson.version;
        log.info(`Local version from package.json is ${localVersion}`);
        // Hit e.g. http://registry.npmjs.org/@ryancavanaugh%2fjquery for version data
        const fullName = common_1.fullPackageName(pkg.typingsPackageName);
        const registryUrl = `https://registry.npmjs.org/${fullName.replace("/", "%2F")}`;
        log.info(`Fetch registry data from ${registryUrl}`);
        // See if this version already exists
        let bodyString;
        try {
            bodyString = yield (yield fetch(registryUrl)).text();
        }
        catch (err) {
            log.error(JSON.stringify(err));
            return [false, logResult()];
        }
        const body = util_1.parseJson(bodyString);
        return [shouldPublish(), logResult()];
        function shouldPublish() {
            if (body.error === "Not found") {
                // OK, just haven't published this one before
                log.info("Registry indicates this is a new package");
                return true;
            }
            else if (body.error) {
                // Critical failure
                log.info("Unexpected response, refer to error log");
                log.error(`NPM registry failure for ${registryUrl}: Unexpected error content ${body.error})`);
                return false;
            }
            else {
                const remoteVersionExists = body.versions && body.versions[localVersion] !== undefined;
                log.info(remoteVersionExists ? "Remote version already exists" : "Remote version does not exist");
                return !remoteVersionExists;
            }
        }
    });
}
exports.shouldPublish = shouldPublish;
function runCommand(commandDescription, log, dry, args) {
    const cmd = args.join(" ");
    log.info(`Run ${cmd}`);
    if (!dry) {
        return new Promise((resolve, reject) => {
            child_process.exec(cmd, { encoding: "utf8" }, (err, stdoutBuffer, stderrBuffer) => {
                // These are wrongly typed as Buffer.
                const stdout = stdoutBuffer;
                const stderr = stderrBuffer;
                if (err) {
                    log.error(`${commandDescription} failed: ${JSON.stringify(err)}`);
                    log.info(`${commandDescription} failed, refer to error log`);
                    log.error(stderr);
                    reject(new Error(stderr));
                }
                else {
                    log.info("Ran successfully");
                    log.info(stdout);
                }
                resolve();
            });
        });
    }
    else {
        log.info("(dry run)");
        return Promise.resolve();
    }
}
//# sourceMappingURL=package-publisher.js.map