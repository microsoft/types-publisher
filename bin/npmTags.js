"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const yargs = require("yargs");
const packages_1 = require("./lib/packages");
const npm_client_1 = require("./lib/npm-client");
const versions_1 = require("./lib/versions");
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
function tagAll(dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const versions = yield versions_1.default.load();
        const client = yield npm_client_1.default.create();
        yield util_1.nAtATime(10, yield packages_1.AllPackages.readTypings(), (pkg) => __awaiter(this, void 0, void 0, function* () {
            // Only update tags for the latest version of the package.
            if (pkg.isLatest) {
                const version = versions.getVersion(pkg).versionString;
                yield addNpmTagsForPackage(pkg, versions, version, client, console.log, dry);
            }
        }));
        // Don't tag notNeeded packages
    });
}
function addNpmTagsForPackage(pkg, versions, version, client, log, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const tags = packages_1.TypeScriptVersion.tagsToUpdate(pkg.typeScriptVersion);
        log(`Tag ${pkg.fullNpmName}@${version} as ${JSON.stringify(tags)}`);
        if (!dry) {
            for (const tag of tags) {
                yield client.tag(pkg.fullEscapedNpmName, version, tag);
            }
        }
        // Prerelease packages should never be tagged latest
        const latestNonPrerelease = versions.latestNonPrerelease(pkg);
        if (latestNonPrerelease) {
            log(`	but tag ${pkg.fullNpmName}@${latestNonPrerelease.versionString} as "latest"`);
            if (!dry) {
                yield tag(latestNonPrerelease.versionString, "latest");
            }
        }
        function tag(versionString, tag) {
            return __awaiter(this, void 0, void 0, function* () {
                yield client.tag(pkg.fullEscapedNpmName, versionString, tag);
            });
        }
    });
}
exports.addNpmTagsForPackage = addNpmTagsForPackage;
//# sourceMappingURL=npmTags.js.map