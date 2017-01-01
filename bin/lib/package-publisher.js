"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const assert = require("assert");
const path = require("path");
const npmTags_1 = require("../npmTags");
const common_1 = require("../lib/common");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
function publishPackage(client, pkg, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLogger();
        log(`Publishing ${pkg.typingsPackageName}`);
        const packageDir = pkg.outputDir();
        const packageJson = yield common_1.readFileAndWarn("generate", path.join(packageDir, "package.json"));
        const version = packageJson.version;
        assert(typeof version === "string");
        yield client.publish(packageDir, packageJson, dry);
        yield npmTags_1.addNpmTagsForPackage(pkg, version, client, log, dry);
        if (pkg.isNotNeeded()) {
            log(`Deprecating ${pkg.typingsPackageName}`);
            // Don't use a newline in the deprecation message because it will be displayed as "\n" and not as a newline.
            const message = pkg.readme(/*useNewline*/ false);
            if (!dry) {
                yield client.deprecate(pkg.fullName(), version, message);
            }
        }
        return logResult();
    });
}
exports.publishPackage = publishPackage;
// Used for testing only.
function unpublishPackage(pkg, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = pkg.fullName();
        const args = ["npm", "unpublish", name, "--force"];
        yield runCommand("Unpublish", logging_1.consoleLogger, dry, args);
    });
}
exports.unpublishPackage = unpublishPackage;
function runCommand(commandDescription, log, dry, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const cmd = args.join(" ");
        log.info(`Run ${cmd}`);
        if (!dry) {
            const { error, stdout, stderr } = yield util_1.exec(cmd);
            if (error) {
                log.error(`${commandDescription} failed: ${JSON.stringify(error)}`);
                log.info(`${commandDescription} failed, refer to error log`);
                log.error(stderr);
                throw new Error(stderr);
            }
            else {
                log.info("Ran successfully");
                log.info(stdout);
            }
        }
        else {
            log.info("(dry run)");
            return Promise.resolve();
        }
    });
}
//# sourceMappingURL=package-publisher.js.map