import { ChangedPackages } from "./lib/versions";
import { Fetcher } from "./util/io";
export default function publishPackages(changedPackages: ChangedPackages, dry: boolean, githubAccessToken: string, fetcher: Fetcher): Promise<void>;
