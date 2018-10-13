"use strict";
// Run `node ./bin/test-get-secrets.js` to test that we can fetch secrets from Azure Keyvault
Object.defineProperty(exports, "__esModule", { value: true });
const secrets_1 = require("./lib/secrets");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main());
}
async function main() {
    for (const secret of secrets_1.allSecrets) {
        console.log(`Fetching secret '${secrets_1.Secret[secret]}'...`);
        console.log(await secrets_1.getSecret(secret));
    }
}
//# sourceMappingURL=test-get-secrets.js.map