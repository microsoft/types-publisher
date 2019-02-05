"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_definitely_typed_1 = require("./get-definitely-typed");
const common_1 = require("./lib/common");
const packages_1 = require("./lib/packages");
const settings_1 = require("./lib/settings");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.logUncaughtErrors(main(common_1.Options.defaults));
}
async function main(options) {
    const log = logging_1.loggerWithErrors()[0];
    const allPackages = await packages_1.AllPackages.read(await get_definitely_typed_1.getDefinitelyTyped(options, log));
    const typings = allPackages.allTypings();
    const maxPathLen = Math.max(...typings.map(t => t.subDirectoryPath.length));
    const lines = util_1.mapDefined(typings, t => getEntry(t, maxPathLen));
    const text = `${header}\n\n${lines.join("\n")}\n`;
    const path = util_1.joinPaths(options.definitelyTypedPath, ".github", "CODEOWNERS");
    await io_1.writeFile(path, text);
}
const header = `# This file is generated.
# Add yourself to the "Definitions by:" list instead.
# See https://github.com/DefinitelyTyped/DefinitelyTyped#edit-an-existing-package`;
function getEntry(pkg, maxPathLen) {
    const users = util_1.mapDefined(pkg.contributors, c => c.githubUsername);
    if (!users.length) {
        return undefined;
    }
    const path = `${pkg.subDirectoryPath}/`.padEnd(maxPathLen);
    return `/${settings_1.typesDirectoryName}/${path} ${users.map(u => `@${u}`).join(" ")}`;
}
//# sourceMappingURL=code-owners.js.map