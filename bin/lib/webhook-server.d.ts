/// <reference types="node" />
import { Server } from "http";
import { Fetcher } from "../util/io";
import { Options } from "./common";
export default function webhookServer(key: string, githubAccessToken: string, dry: boolean, fetcher: Fetcher, options: Options): Promise<Server>;
export declare function expectedSignature(key: string, data: string): string;
