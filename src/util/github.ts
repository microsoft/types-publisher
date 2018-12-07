import { Fetcher } from "./io";
import { logger } from "./logging";

export async function queryGithub(path: string, githubToken: string, fetcher: Fetcher) {
    const [log] = logger();
    log("Requesting from github: " + path);
    return fetcher.fetchJson({
        hostname: "api.github.com",
        path: path + "&access_token=" + githubToken,
        method: "GET",
        headers: {
            // arbitrary string, but something must be provided
            "User-Agent": "types-publisher",
        },
    });
}
