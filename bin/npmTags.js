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
    // TODO: package-publisher.ts doesn't have a main block so probably should just merge this here
    //  (although npmTags is run in yet a THIRD case, unrelated to npm or to the azure app. It updates for a release.)
    //  this is the most overloaded piece of software ever
    const dry = !!yargs.argv.dry;
    util_1.logUncaughtErrors(tag(dry, yargs.argv.name));
}
/**
 * Refreshes the tags on every package.
 * This shouldn't normally need to run, since we run `tagSingle` whenever we publish a package.
 * But this should be run if the way we calculate tags changes (e.g. when a new release is allowed to be tagged "latest").
 */
async function tag(dry, name) {
    const publishClient = await npm_client_1.NpmPublishClient.create();
    await npm_client_1.CachedNpmInfoClient.with(new npm_client_1.UncachedNpmInfoClient(), async (infoClient) => {
        if (name) {
            const pkg = await packages_1.AllPackages.readSingle(name);
            const version = await versions_1.getLatestTypingVersion(pkg, infoClient);
            await updateTypeScriptVersionTags(pkg, version, publishClient, logging_1.consoleLogger.info, dry);
            await updateLatestTag(pkg.fullEscapedNpmName, version, publishClient, logging_1.consoleLogger.info, dry);
        }
        else {
            await util_1.nAtATime(10, await packages_1.AllPackages.readLatestTypings(), async (pkg) => {
                // Only update tags for the latest version of the package.
                const version = await versions_1.getLatestTypingVersion(pkg, infoClient);
                await updateTypeScriptVersionTags(pkg, version, publishClient, logging_1.consoleLogger.info, dry);
                await updateLatestTag(pkg.fullEscapedNpmName, version, publishClient, logging_1.consoleLogger.info, dry);
            });
        }
    });
    // Don't tag notNeeded packages
}
async function updateTypeScriptVersionTags(pkg, version, client, log, dry) {
    const tags = definitelytyped_header_parser_1.TypeScriptVersion.tagsToUpdate(pkg.minTypeScriptVersion);
    log(`Tag ${pkg.fullNpmName}@${version} as ${JSON.stringify(tags)}`);
    if (dry) {
        log("(dry) Skip tag");
    }
    else {
        for (const tagName of tags) {
            await client.tag(pkg.fullEscapedNpmName, version, tagName);
        }
    }
}
exports.updateTypeScriptVersionTags = updateTypeScriptVersionTags;
async function updateLatestTag(fullEscapedNpmName, version, client, log, dry) {
    log(`   but tag ${fullEscapedNpmName}@${version} as "latest"`);
    if (dry) {
        log("   (dry) Skip move \"latest\" back to newest version");
    }
    else {
        await client.tag(fullEscapedNpmName, version, "latest");
    }
}
exports.updateLatestTag = updateLatestTag;
//# sourceMappingURL=npmTags.js.map