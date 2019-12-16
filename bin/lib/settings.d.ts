/** URL of the NPM registry to upload to. */
export declare const npmRegistryHostName = "registry.npmjs.org";
export declare const githubRegistryHostName = "npm.pkg.github.com";
export declare const npmRegistry: string;
export declare const githubRegistry: string;
export declare const npmApi = "api.npmjs.org";
/** Note: this is 'types' and not '@types' */
export declare const scopeName = "types";
/** TODO: Change this to definitelytyped when it's ready */
export declare const orgName = "testtypepublishing";
export declare const dataDirPath: string;
export declare const outputDirPath: string;
export declare const validateOutputPath: string;
export declare const logDir: string;
/** URL to download the repository from. */
export declare const definitelyTypedZipUrl = "https://codeload.github.com/DefinitelyTyped/DefinitelyTyped/tar.gz/master";
/** The branch that DefinitelyTyped is sourced from. */
export declare const sourceBranch = "master";
/** Name of the azure storage account. Used for uploading data and logs. */
export declare const azureStorageAccount = "typespublisher";
/** Name of the azure container. */
export declare const azureContainer = "typespublisher";
/** URL of azure keyvault. */
export declare const azureKeyvault = "https://types-publisher-keys.vault.azure.net";
/** Issue in types-publisher that we will use to report webhook errors. */
export declare const errorsIssue = "Microsoft/types-publisher/issues/40";
export declare const typesDirectoryName = "types";
export declare const dependenciesWhitelist: ReadonlySet<string>;
