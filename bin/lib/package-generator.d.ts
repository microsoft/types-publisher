import { FS } from "../get-definitely-typed";
import { AllPackages, NotNeededPackage, TypingsData } from "./packages";
export declare function generateTypingPackage(typing: TypingsData, packages: AllPackages, version: string, dt: FS): Promise<void>;
export declare function generateNotNeededPackage(pkg: NotNeededPackage): Promise<void>;
