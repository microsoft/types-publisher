import { BlobService, common, createBlobService, ErrorOrResponse, ErrorOrResult } from "azure-storage";
import * as fs from "fs";

import { fetchResponse, streamDone, streamOfString, stringOfStream } from "../util/io";
import { gzip, unGzip } from "../util/tgz";
import { parseJson } from "../util/util";

import { getSecret, Secret } from "./secrets";
import { azureContainer, azureStorageAccount } from "./settings";

export default class BlobWriter {
	static async create(): Promise<BlobWriter> {
		return new BlobWriter(createBlobService(azureStorageAccount, await getSecret(Secret.AZURE_STORAGE_ACCESS_KEY)));
	}

	private constructor(private service: BlobService) {}

	setCorsProperties(): Promise<void> {
		const properties: common.models.ServicePropertiesResult.ServiceProperties = {
			Cors: {
				CorsRule: [
					{
						AllowedOrigins: ["*"],
						AllowedMethods: ["GET"],
						AllowedHeaders: [],
						ExposedHeaders: [],
						MaxAgeInSeconds: 60 * 60 * 24 // 1 day
					}
				]
			}
		};
		return promisifyErrorOrResponse(cb => { this.service.setServiceProperties(properties, cb); });
	}

	ensureCreated(options: BlobService.CreateContainerOptions): Promise<void> {
		return promisifyErrorOrResult<BlobService.ContainerResult>(cb => {
			this.service.createContainerIfNotExists(azureContainer, options, cb);
		}) as any as Promise<void>;
	}

	createBlobFromFile(blobName: string, fileName: string): Promise<void> {
		return this.createBlobFromStream(blobName, fs.createReadStream(fileName));
	}

	createBlobFromText(blobName: string, text: string): Promise<void> {
		return this.createBlobFromStream(blobName, streamOfString(text));
	}

	async listBlobs(prefix: string): Promise<BlobService.BlobResult[]> {
		const once = (token: common.ContinuationToken | undefined) =>
			promisifyErrorOrResult<BlobService.ListBlobsResult>(cb => {
				this.service.listBlobsSegmentedWithPrefix(azureContainer, prefix, token!, cb);
			});

		const out: BlobService.BlobResult[] = [];
		let token: common.ContinuationToken | undefined;
		do {
			const {entries, continuationToken}: BlobService.ListBlobsResult = await once(token);
			out.push(...entries);
			token = continuationToken;
		} while (token);

		return out;
	}

	deleteBlob(blobName: string): Promise<void> {
		return promisifyErrorOrResponse(cb => {
			this.service.deleteBlob(azureContainer, blobName, cb);
		});
	}

	private createBlobFromStream(blobName: string, stream: NodeJS.ReadableStream): Promise<void> {
		const options: BlobService.CreateBlobRequestOptions =  {
			contentSettings: {
				contentEncoding: "GZIP",
				contentType: "application/json; charset=utf-8"
			}
		};
		// Remove `undefined!` once https://github.com/Azure/azure-storage-node/pull/267 is in
		return streamDone(gzip(stream).pipe(this.service.createWriteStreamToBlockBlob(azureContainer, blobName, options, undefined!)));
	}
}

export async function readBlob(blobName: string): Promise<string> {
	const url = urlOfBlob(blobName);
	const response = await fetchResponse(url);
	if (response.headers["content-encoding"] !== "GZIP") {
		throw new Error(`${url} is not gzipped`);
	}
	return stringOfStream(unGzip(response));
}

export async function readJsonBlob(blobName: string): Promise<any> {
	return parseJson(await readBlob(blobName));
}

export function urlOfBlob(blobName: string): string {
	return `https://${azureContainer}.blob.core.windows.net/${azureContainer}/${blobName}`;
}

function promisifyErrorOrResult<A>(callsBack: (x: ErrorOrResult<A>) => void): Promise<A> {
	return new Promise<A>((resolve, reject) => {
		callsBack((err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

function promisifyErrorOrResponse(callsBack: (x: ErrorOrResponse) => void): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		callsBack(err => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}
