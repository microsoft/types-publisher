"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require("fs");
const yargs = require("yargs");
const common_1 = require("./lib/common");
const logging_1 = require("./lib/logging");
const npm_client_1 = require("./lib/npm-client");
const publisher = require("./lib/package-publisher");
const util_1 = require("./lib/util");
const versions_1 = require("./lib/versions");
if (!module.parent) {
    if (!common_1.existsTypesDataFileSync()) {
        console.log("Run parse-definitions first!");
    }
    else if (!versions_1.default.existsSync()) {
        console.log("Run calculate-versions first!");
    }
    else if (!fs.existsSync("./output") || fs.readdirSync("./output").length === 0) {
        console.log("Run generate-packages first!");
    }
    else {
        const dry = !!yargs.argv.dry;
        const singleName = yargs.argv.single;
        // For testing only. Do not use on real @types repo.
        const shouldUnpublish = !!yargs.argv.unpublish;
        if (singleName && shouldUnpublish) {
            throw new Error("Select only one of --single=foo or --shouldUnpublish");
        }
        util_1.done(go());
        function go() {
            return __awaiter(this, void 0, void 0, function* () {
                if (shouldUnpublish) {
                    yield unpublish(dry);
                }
                else {
                    const client = yield npm_client_1.default.create();
                    if (singleName) {
                        yield single(client, singleName, dry);
                    }
                    else {
                        yield main(client, dry);
                    }
                }
            });
        }
    }
}
function main(client, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.logger();
        if (dry) {
            log("=== DRY RUN ===");
        }
        const packagesShouldPublish = yield versions_1.changedPackages(yield common_1.readAllPackages());
        for (const pkg of packagesShouldPublish) {
            console.log(`Publishing ${pkg.libraryName}...`);
            const publishLog = yield publisher.publishPackage(client, pkg, dry);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function single(client, name, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const pkg = (yield common_1.readAllPackages()).find(p => p.typingsPackageName === name);
        if (pkg === undefined) {
            throw new Error(`Can't find a package named ${name}`);
        }
        const publishLog = yield publisher.publishPackage(client, pkg, dry);
        console.log(publishLog);
    });
}
function unpublish(dry) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const pkg of yield common_1.readAllPackages()) {
            yield publisher.unpublishPackage(pkg, dry);
        }
    });
}
//# sourceMappingURL=publish-packages.js.map