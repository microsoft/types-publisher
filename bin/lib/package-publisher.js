"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const common_1 = require("../lib/common");
const npmTags_1 = require("../npmTags");
const logging_1 = require("../util/logging");
const util_1 = require("../util/util");
async function publishPackage(client, pkg, allPackagesBeingPublished, versions, latestVersion, dry) {
    assert(pkg.isLatest === (pkg === latestVersion));
    const [log, logResult] = logging_1.quietLogger();
    log(`Publishing ${pkg.desc}`);
    const packageDir = pkg.outputDirectory;
    const packageJson = await common_1.readFileAndWarn("generate", util_1.joinPaths(packageDir, "package.json"));
    await client.publish(packageDir, packageJson, dry);
    const latestVersionString = versions.getVersion(latestVersion).versionString;
    if (pkg.isLatest) {
        await npmTags_1.updateTypeScriptVersionTags(latestVersion, latestVersionString, client, log, dry);
    }
    if (pkg.isLatest || !allPackagesBeingPublished.includes(latestVersion)) {
        // If this is an older version of the package, we still update tags for the *latest*.
        // NPM will update "latest" even if we are publishing an older version of a package (https://github.com/npm/npm/issues/6778),
        // so we must undo that by re-tagging latest.
        await npmTags_1.updateLatestTag(latestVersion, versions, client, log, dry);
    }
    if (pkg.isNotNeeded()) {
        log(`Deprecating ${pkg.name}`);
        assert(latestVersionString === pkg.version.versionString);
        // Don't use a newline in the deprecation message because it will be displayed as "\n" and not as a newline.
        await deprecateNotNeededPackage(client, pkg, dry);
    }
    return logResult();
}
exports.default = publishPackage;
async function deprecateNotNeededPackage(client, pkg, dry = false) {
    if (!dry) {
        await client.deprecate(pkg.fullNpmName, pkg.version.versionString, pkg.deprecatedMessage());
    }
}
exports.deprecateNotNeededPackage = deprecateNotNeededPackage;
//# sourceMappingURL=package-publisher.js.map