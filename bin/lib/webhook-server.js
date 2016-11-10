"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const crypto_1 = require("crypto");
const http_1 = require("http");
const full_1 = require("../full");
const logging_1 = require("../util/logging");
const io_1 = require("../util/io");
const util_1 = require("../util/util");
const rolling_logs_1 = require("./rolling-logs");
const common_1 = require("./common");
const issue_updater_1 = require("./issue-updater");
const npm_client_1 = require("./npm-client");
function server(key, githubAccessToken, dry, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield npm_client_1.default.create();
        return listenToGithub(key, githubAccessToken, dry, updateOneAtATime((log, timeStamp) => __awaiter(this, void 0, void 0, function* () {
            log.info("");
            log.info("");
            log.info(`# ${timeStamp}`);
            log.info("");
            log.info("Starting full...");
            yield full_1.default(client, dry, timeStamp, options);
        })));
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = server;
function writeLog(rollingLogs, logs) {
    return rollingLogs.write(logging_1.joinLogWithErrors(logs));
}
function webResult(dry, timeStamp) {
    // tslint:disable:max-line-length
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
    // tslint:enable:max-line-length
}
/** @param onUpdate: returns a promise in case it may error. Server will shut down on errors. */
function listenToGithub(key, githubAccessToken, dry, onUpdate) {
    const rollingLogs = rolling_logs_1.default.create("webhook-logs.md", 1000);
    const webText = webResult(dry, util_1.currentTimeStamp());
    const server = http_1.createServer((req, resp) => {
        switch (req.method) {
            case "GET":
                resp.write(webText);
                resp.end();
                break;
            case "POST":
                receiveUpdate(req, resp);
                break;
            default:
        }
    });
    return server;
    function receiveUpdate(req, resp) {
        const [log, logResult] = logging_1.loggerWithErrors();
        const timeStamp = util_1.currentTimeStamp();
        try {
            work().then(() => rollingLogs.then(logs => writeLog(logs, logResult()))).catch(onError);
        }
        catch (error) {
            rollingLogs.then(logs => writeLog(logs, logResult())).then(() => onError(error)).catch(onError);
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
        function work() {
            return __awaiter(this, void 0, void 0, function* () {
                const data = yield io_1.stringOfStream(req);
                if (!checkSignature(key, data, req.headers, log)) {
                    return;
                }
                log.info(`Message from github: ${data}`);
                const expectedRef = `refs/heads/${common_1.settings.sourceBranch}`;
                const actualRef = util_1.parseJson(data).ref;
                if (actualRef === expectedRef) {
                    respond("Thanks for the update! Running full.");
                    yield onUpdate(log, timeStamp);
                }
                else {
                    const text = `Ignoring push to ${actualRef}, expected ${expectedRef}.`;
                    respond(text);
                    log.info(text);
                }
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
function checkSignature(key, data, headers, log) {
    const signature = headers["x-hub-signature"];
    const expected = expectedSignature(key, data);
    if (stringEqualsConstantTime(signature, expected)) {
        return true;
    }
    log.error(`Invalid request: expected ${expected}, got ${signature}`);
    log.error(`Headers are: ${JSON.stringify(headers, undefined, 4)}`);
    log.error(`Data is: ${data}`);
    log.error("");
    return false;
}
// Use a constant-time compare to prevent timing attacks
function stringEqualsConstantTime(actual, expected) {
    // `timingSafeEqual` throws if they don't have the same length.
    const actualBuffer = new Buffer(expected.length);
    actualBuffer.write(actual);
    return crypto_1.timingSafeEqual(actualBuffer, new Buffer(expected));
}
function expectedSignature(key, data) {
    const hmac = crypto_1.createHmac("sha1", key);
    hmac.write(data);
    const digest = hmac.digest("hex");
    return `sha1=${digest}`;
}
exports.expectedSignature = expectedSignature;
//# sourceMappingURL=webhook-server.js.map