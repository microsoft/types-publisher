import full from "../full";
import { Fetcher } from "../util/io";
import { LoggerWithErrors, loggerWithErrors } from "../util/logging";
import { currentTimeStamp } from "../util/util";

import { Options } from "./common";
import { setTimeout } from "timers";

export default function webhookServer(
    githubAccessToken: string,
    dry: boolean,
    fetcher: Fetcher,
    options: Options,
): void {
    setTimeout(timedUpdate(githubAccessToken, dry, fetcher, options), 200_000, loggerWithErrors()[0]);
}

function timedUpdate(
    githubAccessToken: string,
    dry: boolean,
    fetcher: Fetcher,
    options: Options,
) {
    return updateOneAtATime(async (log) => {
        const timeStamp = currentTimeStamp();
        log.info(""); log.info("");
        log.info(`# ${timeStamp}`);
        log.info("");
        log.info("Starting full from timed update...");
        await full(dry, timeStamp, githubAccessToken, fetcher, options);
        setTimeout(timedUpdate(githubAccessToken, dry, fetcher, options), 1_000_000, log);
    });
}

// Even if there are many changes to DefinitelyTyped in a row, we only perform one update at a time.
function updateOneAtATime(
    doOnce: (log: LoggerWithErrors, timeStamp: string) => Promise<void>,
): (log: LoggerWithErrors, timeStamp: string) => Promise<void> | undefined {
    let working = false;
    let anyUpdatesWhileWorking = false;

    return (log, timeStamp) => {
        if (working) {
            anyUpdatesWhileWorking = true;
            log.info("Not starting update, because already performing one.");
            return undefined;
        } else {
            working = false;
            anyUpdatesWhileWorking = false;
            return work();
        }

        async function work(): Promise<void> {
            log.info("Starting update");
            working = true;
            anyUpdatesWhileWorking = false;
            do {
                await doOnce(log, timeStamp);
                working = false;
            } while (anyUpdatesWhileWorking);
        }
    };
}
