import "server-only";
import { LocalDiskStorage } from "./local-disk";
import { VercelBlobStorage } from "./vercel-blob";

/**
 * Where uploaded bytes live.
 *
 * The rest of the app only knows this interface. Two implementations exist:
 *
 *   STORAGE_DRIVER=local        (default) a folder on disk, see local-disk.ts
 *   STORAGE_DRIVER=vercel-blob  a private Vercel Blob store, see vercel-blob.ts
 *
 * To add another (S3, Cloudflare R2, Google Cloud Storage...) write a class
 * that implements it and add a case to `createStorage` below. Nothing else
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
  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "local":
      return new LocalDiskStorage(process.env.UPLOAD_DIR ?? "./storage/uploads");
    case "vercel-blob":
      return new VercelBlobStorage(process.env.UPLOAD_DIR ?? "uploads");
    default:
      throw new Error(`Unknown STORAGE_DRIVER "${driver}". Use "local" or "vercel-blob".`);
  }
}

const globalForStorage = globalThis as unknown as { fileStorage?: FileStorage };

export const storage: FileStorage = globalForStorage.fileStorage ?? createStorage();

if (process.env.NODE_ENV !== "production") {
  globalForStorage.fileStorage = storage;
}
