"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const assert = require("assert");
const bufferEqualsConstantTime = require("buffer-equals-constant");
const crypto_1 = require("crypto");
const http_1 = require("http");
const full_1 = require("../full");
const rolling_logs_1 = require("./rolling-logs");
const common_1 = require("./common");
const issue_updater_1 = require("./issue-updater");
const npm_client_1 = require("./npm-client");
const util_1 = require("./util");
const rollingLogs = new rolling_logs_1.default("webhook-logs.md", 1000);
function server(key, githubAccessToken, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield npm_client_1.default.create();
        return listenToGithub(key, githubAccessToken, dry, updateOneAtATime((log, timeStamp) => __awaiter(this, void 0, void 0, function* () {
            log.info("");
            log.info("");
            log.info(`# ${timeStamp}`);
            log.info("");
            log.info("Starting full...");
            yield full_1.default(client, dry, timeStamp);
        })));
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = server;
function writeLog(log) {
    const { infos, errors } = log.result();
    assert(!errors.length);
    return rollingLogs.write(infos);
}
function webResult(dry, timeStamp) {
    return `
<html>
<head></head>
<body>
	This is the TypeScript types-publisher webhook server.<br/>
	If you can read this, the webhook is running. (Dry mode: <strong>${dry}</strong>)<br/>
	Latest deploy was on <strong>${timeStamp}</strong>.
	You probably meant to see:
	<ul>
		<li><a href="https://typespublisher.blob.core.windows.net/typespublisher/index.html">Latest data</a></li>
		<li><a href="https://github.com/Microsoft/types-publisher">GitHub</a></li>
		<li><a href="https://github.com/Microsoft/types-publisher/issues/40">Server status issue</a></li>
		<li><a href="https://ms.portal.azure.com/?resourceMenuPerf=true#resource/subscriptions/99160d5b-9289-4b66-8074-ed268e739e8e/resourceGroups/Default-Web-WestUS/providers/Microsoft.Web/sites/types-publisher/App%20Services">Azure account (must have permission)</a></li>
	</ul>
</body>
</html>
`;
}
/** @param onUpdate: returns a promise in case it may error. Server will shut down on errors. */
function listenToGithub(key, githubAccessToken, dry, onUpdate) {
    const webText = webResult(dry, util_1.currentTimeStamp());
    const server = http_1.createServer((req, resp) => {
        switch (req.method) {
            case "GET":
                resp.write(webText);
                resp.end();
                break;
            case "POST":
                req.on("data", (data) => receiveUpdate(data, req.headers, resp));
                break;
            default:
        }
    });
    return server;
    function receiveUpdate(data, headers, resp) {
        const log = new common_1.ArrayLog(true);
        const timeStamp = util_1.currentTimeStamp();
        try {
            if (!checkSignature(key, data, headers["x-hub-signature"])) {
                log.error(`Request does not have the correct x-hub-signature: headers are ${JSON.stringify(headers, undefined, 4)}`);
                return;
            }
            log.info(`Message from github: ${data}`);
            const expectedRef = `refs/heads/${common_1.settings.sourceBranch}`;
            const actualRef = util_1.parseJson(data).ref;
            if (actualRef === expectedRef) {
                respond("Thanks for the update! Running full.");
                const update = onUpdate(log, timeStamp);
                if (update) {
                    update.catch(onError);
                }
                return;
            }
            else {
                const text = `Ignoring push to ${actualRef}, expected ${expectedRef}.`;
                respond(text);
                log.info(text);
            }
            writeLog(log).catch(onError);
        }
        catch (error) {
            writeLog(log).then(() => onError(error)).catch(onError);
        }
        function onError(error) {
            server.close();
            issue_updater_1.reopenIssue(githubAccessToken, timeStamp, error).catch(issueError => {
                console.error(issueError.stack);
            }).then(() => {
                console.error(error.stack);
                process.exit(1);
            });
        }
        // This is for the benefit of `npm run make-[production-]server-run`. GitHub ignores this.
        function respond(text) {
            resp.write(text);
            resp.end();
        }
    }
}
// Even if there are many changes to DefinitelyTyped in a row, we only perform one update at a time.
function updateOneAtATime(doOnce) {
    let working = false;
    let anyUpdatesWhileWorking = false;
    return (log, timeStamp) => {
        if (working) {
            anyUpdatesWhileWorking = true;
            log.info(`Not starting update, because already performing one.`);
            return undefined;
        }
        else {
            working = false;
            anyUpdatesWhileWorking = false;
            return work();
        }
        function work() {
            return __awaiter(this, void 0, void 0, function* () {
                log.info(`Starting update`);
                working = true;
                anyUpdatesWhileWorking = false;
                do {
                    yield doOnce(log, timeStamp);
                    working = false;
                } while (anyUpdatesWhileWorking);
            });
        }
    };
}
function checkSignature(key, data, actualSignature) {
    // Use a constant-time compare to prevent timing attacks
    return stringEqualsConstantTime(expectedSignature(key, data), actualSignature);
    function stringEqualsConstantTime(s1, s2) {
        return bufferEqualsConstantTime(new Buffer(s1), new Buffer(s2));
    }
}
function expectedSignature(key, data) {
    const hmac = crypto_1.createHmac("sha1", key);
    hmac.write(data);
    const digest = hmac.digest("hex");
    return `sha1=${digest}`;
}
exports.expectedSignature = expectedSignature;
//# sourceMappingURL=webhook-server.js.map