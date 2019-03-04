import { Options } from "./lib/common";
import { Fetcher } from "./util/io";
import { LoggerWithErrors } from "./util/logging";
export default function full(dry: boolean, timeStamp: string, githubAccessToken: string, fetcher: Fetcher, options: Options, log: LoggerWithErrors): Promise<void>;
