import { base64ToArrayBuffer } from "./crypto-utils";

/**
 * AES-GCM encrypted file result.
 */
export interface EncryptedFileResult {
  file: File;
  metadata: {
    originalName: string;
    originalType: string;
    originalSize: number;
    encryptedSize: number;
    algorithm: "AES-GCM";
    iv: string;
    authTag: string;
  };
}

const IV_LENGTH = 12;
const AES_KEY_LENGTH = 256;

function uint8ToBase64(data: Uint8Array): string {
  let binary = "";

  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }

  return btoa(binary);
}

async function importAesKey(rawKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  const keyBytes = encoder.encode(rawKey);

  const normalizedKey = new Uint8Array(32);

  normalizedKey.set(keyBytes.slice(0, 32));

  return crypto.subtle.importKey(
    "raw",
    normalizedKey,
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptImage(
  file: File,
  encryptionKey: string,
): Promise<EncryptedFileResult> {
  if (!(file instanceof File)) {
    throw new TypeError("Invalid file");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await importAesKey(encryptionKey);

  const fileBuffer = await file.arrayBuffer();

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    fileBuffer,
  );

  const encryptedFile = new File([encryptedBuffer], file.name, {
    type: file.type,
    lastModified: Date.now(),
  });

  // also return authTag
  const authTag = encryptedBuffer.slice(-16);
  return {
    file: encryptedFile,
    metadata: {
      originalName: file.name,
      originalType: file.type,
      originalSize: file.size,
      encryptedSize: encryptedFile.size,
      algorithm: "AES-GCM",
      iv: uint8ToBase64(iv),
      authTag: uint8ToBase64(new Uint8Array(authTag)),
    },
  };
}

export async function decryptImage(
  file: ArrayBuffer,
  encryptionKey: string,
  iv: string,
): Promise<Blob> {
  const payload = new Uint8Array(file);

  const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));

  const key = await importAesKey(encryptionKey);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
    },
    key,
    payload,
  );

  return new Blob([decryptedBuffer]);
}

export function getBlobUrlFromFile(file: Blob): string {
  return URL.createObjectURL(file);
}
