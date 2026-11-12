import "server-only";
import { LocalDiskStorage } from "./local-disk";

/**
 * Where uploaded bytes live.
 *
 * The rest of the app only knows this interface. To move to object storage
 * (S3, Cloudflare R2, Google Cloud Storage...) write another class that
 * implements it and return that from `createStorage` below. Nothing else
 * needs to change, because pages never link to files directly: every file is
 * served by src/app/api/files/[id]/route.ts after a permission check.
 */
export interface FileStorage {
  put(key: string, data: Buffer): Promise<void>;
  /** Returns null when the key does not exist. */
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

function createStorage(): FileStorage {
  return new LocalDiskStorage(process.env.UPLOAD_DIR ?? "./storage/uploads");
}

const globalForStorage = globalThis as unknown as { fileStorage?: FileStorage };

export const storage: FileStorage = globalForStorage.fileStorage ?? createStorage();

if (process.env.NODE_ENV !== "production") {
  globalForStorage.fileStorage = storage;
}
