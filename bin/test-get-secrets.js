// Run `node ./bin/test-get-secrets.js` to test that we can fetch secrets from Azure Keyvault
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const secrets_1 = require("./lib/secrets");
const util_1 = require("./util/util");
if (!module.parent) {
    util_1.done(main());
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        for (const secret of secrets_1.allSecrets) {
            console.log(`Fetching secret '${secrets_1.Secret[secret]}'...`);
            console.log(yield secrets_1.getSecret(secret));
        }
    });
}
//# sourceMappingURL=test-get-secrets.js.map