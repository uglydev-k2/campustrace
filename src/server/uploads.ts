import "server-only";
import { randomBytes } from "node:crypto";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { detectFileType, EVIDENCE_TYPES, IMAGE_TYPES } from "@/lib/file-types";
import { storage } from "@/server/storage";

export type ValidatedUpload = {
  data: Buffer;
  mimeType: string;
  extension: string;
  originalName: string;
};

export type StoredUpload = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
};

export type UploadResult =
  | { ok: true; uploads: ValidatedUpload[] }
  | { ok: false; message: string };

const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/**
 * Reads the files from one form field and checks size, count and real type.
 * Browsers send an empty File when nothing was chosen, so those are skipped.
 */
export async function readUploads(
  entries: FormDataEntryValue[],
  options: { kind: "photo" | "evidence"; maxFiles: number },
): Promise<UploadResult> {
  const files = entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const allowed = options.kind === "photo" ? IMAGE_TYPES : EVIDENCE_TYPES;
  const allowedLabel = options.kind === "photo" ? "JPEG, PNG or WebP" : "JPEG, PNG, WebP or PDF";

  if (files.length > options.maxFiles) {
    return {
      ok: false,
      message: `Attach at most ${options.maxFiles} file${options.maxFiles === 1 ? "" : "s"}.`,
    };
  }

  const uploads: ValidatedUpload[] = [];
  for (const file of files) {
    if (file.size > UPLOAD_LIMITS.maxFileBytes) {
      return {
        ok: false,
        message: `“${file.name}” is larger than ${megabytes(UPLOAD_LIMITS.maxFileBytes)}.`,
      };
    }
    const data = Buffer.from(await file.arrayBuffer());
    const detected = detectFileType(data);
    if (!detected || !allowed.includes(detected.mimeType)) {
      return { ok: false, message: `“${file.name}” is not a ${allowedLabel} file.` };
    }
    uploads.push({
      data,
      mimeType: detected.mimeType,
      extension: detected.extension,
      // Kept only as a label. It is never used as a path.
      originalName: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "file",
    });
  }
  return { ok: true, uploads };
}

/** Writes validated files to storage under random, unguessable keys. */
export async function storeUploads(uploads: ValidatedUpload[]): Promise<StoredUpload[]> {
  const stored: StoredUpload[] = [];
  for (const upload of uploads) {
    const storageKey = `${randomBytes(16).toString("hex")}.${upload.extension}`;
    await storage.put(storageKey, upload.data);
    stored.push({
      storageKey,
      mimeType: upload.mimeType,
      sizeBytes: upload.data.length,
      originalName: upload.originalName,
    });
  }
  return stored;
}

/** Removes files again when the database write that referenced them failed. */
export async function discardUploads(stored: StoredUpload[]): Promise<void> {
  await Promise.allSettled(stored.map((file) => storage.delete(file.storageKey)));
}
