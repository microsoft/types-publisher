import full from "../full";
import { Fetcher } from "../util/io";
import { LoggerWithErrors, loggerWithErrors } from "../util/logging";
import { currentTimeStamp } from "../util/util";

import { Options } from "./common";
import { setInterval } from "timers";

export default async function webhookServer(
    githubAccessToken: string,
    dry: boolean,
    fetcher: Fetcher,
    options: Options,
): Promise<void> {
    const fullOnce = updateOneAtATime(async (log) => {
        const timeStamp = currentTimeStamp();
        log.info(""); log.info("");
        log.info(`# ${timeStamp}`);
        log.info("");
        log.info("Starting full...");
        await full(dry, timeStamp, githubAccessToken, fetcher, options);
    });

    const log = loggerWithErrors()[0];
    await fullOnce(log);
    setInterval(fullOnce, 1_000_000, log);
}

// Even if there are many changes to DefinitelyTyped in a row, we only perform one update at a time.
function updateOneAtATime(
    doOnce: (log: LoggerWithErrors) => Promise<void>,
): (log: LoggerWithErrors) => Promise<void> | undefined {
    let working = false;
    let anyUpdatesWhileWorking = false;

    return (log) => {
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
                await doOnce(log);
                working = false;
            } while (anyUpdatesWhileWorking);
        }
    };
}
