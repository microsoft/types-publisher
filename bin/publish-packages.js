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
const npm_client_1 = require("./lib/npm-client");
const publisher = require("./lib/package-publisher");
const util_1 = require("./lib/util");
if (!module.parent) {
    if (!common_1.existsTypesDataFileSync() || !fs.existsSync("./output") || fs.readdirSync("./output").length === 0) {
        console.log("Run parse-definitions and generate-packages first!");
    }
    else {
        const dry = !!yargs.argv.dry;
        const singleName = yargs.argv.single;
        // For testing only. Do not use on real @types repo.
        const shouldUnpublish = !!yargs.argv.unpublish;
        if (singleName && shouldUnpublish) {
            throw new Error("Select only one --singleName=foo or --shouldUnpublish");
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
        const log = [];
        if (dry) {
            console.log("=== DRY RUN ===");
            log.push("=== DRY RUN ===");
        }
        const packagesShouldPublish = [];
        log.push("Checking which packages we should publish");
        yield util_1.nAtATime(100, yield common_1.readAllPackages(), (pkg) => __awaiter(this, void 0, void 0, function* () {
            const [shouldPublish, checkLog] = yield publisher.shouldPublish(pkg);
            if (shouldPublish) {
                packagesShouldPublish.push(pkg);
            }
            log.push(`Checking ${pkg.libraryName}...`);
            writeLogs(checkLog);
        }));
        packagesShouldPublish.sort((pkgA, pkgB) => pkgA.libraryName.localeCompare(pkgB.libraryName));
        for (const pkg of packagesShouldPublish) {
            console.log(`Publishing ${pkg.libraryName}...`);
            const publishLog = yield publisher.publishPackage(client, pkg, dry);
            writeLogs(publishLog);
        }
        function writeLogs(res) {
            for (const line of res.infos) {
                log.push(`   * ${line}`);
            }
            for (const err of res.errors) {
                log.push(`   * ERROR: ${err}`);
                console.error(` Error! ${err}`);
            }
        }
        yield common_1.writeLog("publishing.md", log);
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