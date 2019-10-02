"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const definitelytyped_header_parser_1 = require("definitelytyped-header-parser");
const common_1 = require("../lib/common");
const util_1 = require("../util/util");
async function publishTypingsPackage(client, changedTyping, dry, log) {
    const { pkg, version, latestVersion } = changedTyping;
    await common(client, pkg, log, dry);
    if (pkg.isLatest) {
        await updateTypeScriptVersionTags(pkg, version, client, log, dry);
    }
    assert((latestVersion === undefined) === pkg.isLatest);
    if (latestVersion !== undefined) {
        // If this is an older version of the package, we still update tags for the *latest*.
        // NPM will update "latest" even if we are publishing an older version of a package (https://github.com/npm/npm/issues/6778),
        // so we must undo that by re-tagging latest.
        await updateLatestTag(pkg.fullNpmName, latestVersion, client, log, dry);
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
    const packageDir = pkg.outputDirectory;
    const packageJson = await common_1.readFileAndWarn("generate", util_1.joinPaths(packageDir, "package.json"));
    await client.publish(packageDir, packageJson, dry, log);
}
async function deprecateNotNeededPackage(client, pkg, dry = false, log) {
    if (dry) {
        log("(dry) Skip deprecate not needed package " + pkg.fullNpmName + " at " + pkg.version.versionString);
    }
    else {
        log(`Deprecating ${pkg.fullNpmName} at ${pkg.version.versionString} with message: ${pkg.deprecatedMessage()}.`);
        await client.deprecate(pkg.fullNpmName, pkg.version.versionString, pkg.deprecatedMessage());
    }
}
exports.deprecateNotNeededPackage = deprecateNotNeededPackage;
async function updateTypeScriptVersionTags(pkg, version, client, log, dry) {
    const tags = definitelytyped_header_parser_1.TypeScriptVersion.tagsToUpdate(pkg.minTypeScriptVersion);
    log(`Tag ${pkg.fullNpmName}@${version} as ${JSON.stringify(tags)}`);
    if (dry) {
        log("(dry) Skip tag");
    }
    else {
        for (const tagName of tags) {
            await client.tag(pkg.fullNpmName, version, tagName, dry, log);
        }
    }
}
exports.updateTypeScriptVersionTags = updateTypeScriptVersionTags;
async function updateLatestTag(fullNpmName, version, client, log, dry) {
    log(`   but tag ${fullNpmName}@${version} as "latest"`);
    if (dry) {
        log("   (dry) Skip move \"latest\" back to newest version");
    }
    else {
        await client.tag(fullNpmName, version, "latest", dry, log);
    }
}
exports.updateLatestTag = updateLatestTag;
//# sourceMappingURL=package-publisher.js.map