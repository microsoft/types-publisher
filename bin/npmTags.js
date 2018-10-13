"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const definitelytyped_header_parser_1 = require("definitelytyped-header-parser");
const yargs = require("yargs");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const dry = !!yargs.argv.dry;
    util_1.done(tagAll(dry));
}
/**
 * Refreshes the tags on every package.
 * This shouldn't normally need to run, since we run `tagSingle` whenever we publish a package.
 * But this should be run if the way we calculate tags changes (e.g. when a new release is allowed to be tagged "latest").
 */
async function tagAll(dry) {
    const versions = await versions_1.default.load();
    const client = await npm_client_1.NpmPublishClient.create();
    await util_1.nAtATime(10, await packages_1.AllPackages.readTypings(), async (pkg) => {
        // Only update tags for the latest version of the package.
        if (pkg.isLatest) {
            const version = versions.getVersion(pkg).versionString;
            await updateTypeScriptVersionTags(pkg, version, client, logging_1.consoleLogger.info, dry);
            await updateLatestTag(pkg, versions, client, logging_1.consoleLogger.info, dry);
        }
    });
    // Don't tag notNeeded packages
}
async function updateTypeScriptVersionTags(pkg, version, client, log, dry) {
    const tags = definitelytyped_header_parser_1.TypeScriptVersion.tagsToUpdate(pkg.minTypeScriptVersion);
    log(`Tag ${pkg.fullNpmName}@${version} as ${JSON.stringify(tags)}`);
    if (!dry) {
        for (const tagName of tags) {
            await tag(version, tagName, client, pkg);
        }
    }
}
exports.updateTypeScriptVersionTags = updateTypeScriptVersionTags;
async function updateLatestTag(pkg, versions, client, log, dry) {
    // Prerelease packages should never be tagged latest
    const latestNonPrerelease = versions.latestNonPrerelease(pkg);
    log(`	but tag ${pkg.fullNpmName}@${latestNonPrerelease.versionString} as "latest"`);
    if (!dry) {
        await tag(latestNonPrerelease.versionString, "latest", client, pkg);
    }
}
exports.updateLatestTag = updateLatestTag;
function tag(versionString, tag, client, pkg) {
    return client.tag(pkg.fullEscapedNpmName, versionString, tag);
}
//# sourceMappingURL=npmTags.js.map