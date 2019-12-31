import { BlobService } from "azure-storage";
export default class BlobWriter {
    private readonly service;
    static create(): Promise<BlobWriter>;
    private constructor();
    setCorsProperties(): Promise<void>;
    ensureCreated(options: BlobService.CreateContainerOptions): Promise<void>;
    createBlobFromFile(blobName: string, fileName: string): Promise<void>;
    createBlobFromText(blobName: string, text: string): Promise<void>;
    listBlobs(prefix: string): Promise<BlobService.BlobResult[]>;
    deleteBlob(blobName: string): Promise<void>;
    private createBlobFromStream;
}
export declare function readBlob(blobName: string): Promise<string>;
export declare function readJsonBlob(blobName: string): Promise<object>;
export declare function urlOfBlob(blobName: string): string;
