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
const yargs = require("yargs");
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const npm_client_1 = require("./lib/npm-client");
const package_publisher_1 = require("./lib/package-publisher");
const packages_1 = require("./lib/packages");
const versions_1 = require("./lib/versions");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    const dry = !!yargs.argv.dry;
    const singleName = yargs.argv.single;
    const deprecateName = yargs.argv.deprecate;
    if (singleName !== undefined && deprecateName !== undefined) {
        throw new Error("Select only one of --single=foo or --deprecate=foo or --shouldUnpublish");
    }
    util_1.done(go());
    function go() {
        return __awaiter(this, void 0, void 0, function* () {
            const dt = yield get_definitely_typed_1.getDefinitelyTyped(common_1.Options.defaults);
            if (deprecateName !== undefined) {
                // A '--deprecate' command is available in case types-publisher got stuck *while* trying to deprecate a package.
                // Normally this should not be needed.
                yield package_publisher_1.deprecateNotNeededPackage(yield npm_client_1.NpmPublishClient.create(), yield packages_1.AllPackages.readSingleNotNeeded(deprecateName, dt));
            }
            else if (singleName !== undefined) {
                yield single(singleName, dt, dry);
            }
            else {
                yield main(dry, dt);
            }
        });
    }
}
function main(dry, dt) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.logger();
        if (dry) {
            log("=== DRY RUN ===");
        }
        const allPackages = yield packages_1.AllPackages.read(dt);
        const versions = yield versions_1.default.load();
        const packagesShouldPublish = yield versions_1.changedPackages(allPackages);
        const client = yield npm_client_1.NpmPublishClient.create();
        for (const pkg of packagesShouldPublish) {
            console.log(`Publishing ${pkg.desc}...`);
            const publishLog = yield package_publisher_1.default(client, pkg, packagesShouldPublish, versions, allPackages.getLatest(pkg), dry);
            writeLogs({ infos: publishLog, errors: [] });
        }
        function writeLogs(res) {
            for (const line of res.infos) {
                log(`   * ${line}`);
            }
            for (const err of res.errors) {
                log(`   * ERROR: ${err}`);
            }
        }
        yield logging_1.writeLog("publishing.md", logResult());
        console.log("Done!");
    });
}
exports.default = main;
function single(name, dt, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const allPackages = yield packages_1.AllPackages.read(dt);
        const versions = yield versions_1.default.load();
        const pkg = yield packages_1.AllPackages.readSingle(name);
        const publishLog = yield package_publisher_1.default(yield npm_client_1.NpmPublishClient.create(), pkg, [], versions, allPackages.getLatest(pkg), dry);
        console.log(publishLog);
    });
}
//# sourceMappingURL=publish-packages.js.map