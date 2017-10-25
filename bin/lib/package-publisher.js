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
const assert = require("assert");
const common_1 = require("../lib/common");
const npmTags_1 = require("../npmTags");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
function publishPackage(client, pkg, versions, latestVersion, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        assert(pkg.isLatest === (pkg === latestVersion));
        const [log, logResult] = logging_1.quietLogger();
        log(`Publishing ${pkg.desc}`);
        const packageDir = pkg.outputDirectory;
        const packageJson = yield common_1.readFileAndWarn("generate", util_1.joinPaths(packageDir, "package.json"));
        yield client.publish(packageDir, packageJson, dry);
        const latestVersionString = versions.getVersion(latestVersion).versionString;
        if (pkg.isLatest) {
            yield npmTags_1.updateTypeScriptVersionTags(latestVersion, latestVersionString, client, log, dry);
        }
        // If this is an older version of the package, we still update tags for the *latest*.
        // NPM will update "latest" even if we are publishing an older version of a package (https://github.com/npm/npm/issues/6778),
        // so we must undo that by re-tagging latest.
        yield npmTags_1.updateLatestTag(latestVersion, versions, client, log, dry);
        if (pkg.isNotNeeded()) {
            log(`Deprecating ${pkg.name}`);
            // Don't use a newline in the deprecation message because it will be displayed as "\n" and not as a newline.
            const message = pkg.readme(/*useNewline*/ false);
            if (!dry) {
                yield client.deprecate(pkg.fullNpmName, latestVersionString, message);
            }
        }
        return logResult();
    });
}
exports.default = publishPackage;
// Used for testing only.
function unpublishPackage(pkg, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = ["npm", "unpublish", pkg.fullNpmName, "--force"];
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