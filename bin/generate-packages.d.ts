import { FS } from "./get-definitely-typed";
import { AllPackages } from "./lib/packages";
import { ChangedPackages } from "./lib/versions";
export default function generatePackages(dt: FS, allPackages: AllPackages, changedPackages: ChangedPackages, tgz?: boolean): Promise<void>;
