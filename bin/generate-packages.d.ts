import { FS } from "./get-definitely-typed";
import { Registry } from "./lib/common";
import { AllPackages, AnyPackage, NotNeededPackage, TypingsData } from "./lib/packages";
import { ChangedPackages } from "./lib/versions";
export default function generatePackages(dt: FS, allPackages: AllPackages, changedPackages: ChangedPackages, tgz?: boolean): Promise<void>;
export declare function createPackageJSON(typing: TypingsData, version: string, packages: AllPackages, registry: Registry): string;
export declare function createNotNeededPackageJSON({ libraryName, license, name, fullNpmName, fullGithubName, sourceRepoURL, version }: NotNeededPackage, registry: Registry): string;
export declare function createReadme(typing: TypingsData, reg: Registry): string;
export declare function getLicenseFileText(typing: AnyPackage): string;
