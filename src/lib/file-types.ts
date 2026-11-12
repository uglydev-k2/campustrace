/**
 * Works out what a file really is from its first bytes.
 *
 * The browser-supplied file name and MIME type can be anything the sender
 * likes, so we never trust them. A file is accepted only if its content
 * starts with the signature of a format on our allow-list.
 */

export type DetectedType = { mimeType: string; extension: string };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

export function detectFileType(bytes: Uint8Array): DetectedType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: "image/png", extension: "png" };
  }
  // WebP: "RIFF" <4 size bytes> "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  // "%PDF-"
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mimeType: "application/pdf", extension: "pdf" };
  }
  return null;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const EVIDENCE_TYPES = [...IMAGE_TYPES, "application/pdf"];
