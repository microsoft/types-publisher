"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const common_1 = require("../lib/common");
const npmTags_1 = require("../npmTags");
const util_1 = require("../util/util");
async function publishTypingsPackage(client, changedTyping, dry, log) {
    const { pkg, version, latestVersion } = changedTyping;
    await common(client, pkg, log, dry);
    if (pkg.isLatest) {
        await npmTags_1.updateTypeScriptVersionTags(pkg, version, client, log, dry);
    }
    assert((latestVersion === undefined) === pkg.isLatest);
    if (latestVersion !== undefined) {
        // If this is an older version of the package, we still update tags for the *latest*.
        // NPM will update "latest" even if we are publishing an older version of a package (https://github.com/npm/npm/issues/6778),
        // so we must undo that by re-tagging latest.
        await npmTags_1.updateLatestTag(pkg.fullEscapedNpmName, latestVersion, client, log, dry);
    }
}
exports.publishTypingsPackage = publishTypingsPackage;
async function publishNotNeededPackage(client, pkg, dry, log) {
    log(`Deprecating ${pkg.name}`);
    await common(client, pkg, log, dry);
    // Don't use a newline in the deprecation message because it will be displayed as "\n" and not as a newline.
    await deprecateNotNeededPackage(client, pkg, dry, log);
}
exports.publishNotNeededPackage = publishNotNeededPackage;
async function common(client, pkg, log, dry) {
    log(`Publishing ${pkg.desc}`);
    const packageDir = pkg.outputDirectory;
    const packageJson = await common_1.readFileAndWarn("generate", util_1.joinPaths(packageDir, "package.json"));
    await client.publish(packageDir, packageJson, dry, log);
}
async function deprecateNotNeededPackage(client, pkg, dry = false, log) {
    if (dry) {
        log("(dry) Skip deprecate not needed package " + pkg.fullNpmName);
    }
    else {
        await client.deprecate(pkg.fullNpmName, pkg.version.versionString, pkg.deprecatedMessage());
    }
}
exports.deprecateNotNeededPackage = deprecateNotNeededPackage;
//# sourceMappingURL=package-publisher.js.map