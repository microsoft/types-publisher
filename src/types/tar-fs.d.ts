import { Readable, Writable } from "stream";

export function pack(directoryName: string): Readable;

export function extract(directoryName: string): Writable;
