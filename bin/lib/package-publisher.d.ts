import { ChangedTyping } from "../lib/versions";
import { Logger } from "../util/logging";
import { NpmPublishClient } from "./npm-client";
import { AnyPackage, NotNeededPackage } from "./packages";
export declare function publishTypingsPackage(client: NpmPublishClient, changedTyping: ChangedTyping, dry: boolean, log: Logger): Promise<void>;
export declare function publishNotNeededPackage(client: NpmPublishClient, pkg: NotNeededPackage, dry: boolean, log: Logger): Promise<void>;
export declare function deprecateNotNeededPackage(client: NpmPublishClient, pkg: NotNeededPackage, dry: boolean | undefined, log: Logger): Promise<void>;
export declare function updateTypeScriptVersionTags(pkg: AnyPackage, version: string, client: NpmPublishClient, log: Logger, dry: boolean): Promise<void>;
export declare function updateLatestTag(fullNpmName: string, version: string, client: NpmPublishClient, log: Logger, dry: boolean): Promise<void>;
