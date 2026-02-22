"use client";

/**
 * E2EE Crypto module for Lilapu audio recordings.
 *
 * Uses Web Crypto API (AES-256-GCM) to encrypt/decrypt audio blobs
 * entirely in the browser. The encryption key never leaves the client.
 *
 * Key storage: localStorage ("lilapu_encryption_key")
 */

const STORAGE_KEY = "lilapu_encryption_key";
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits — recommended for GCM

// ── Key Management ──────────────────────────────────────────────────

async function generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: ALGORITHM, length: KEY_LENGTH },
        true, // extractable — needed for export/import
        ["encrypt", "decrypt"]
    );
}

async function exportKeyToBase64(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("raw", key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importKeyFromBase64(base64: string): Promise<CryptoKey> {
    const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw, { name: ALGORITHM, length: KEY_LENGTH }, true, [
        "encrypt",
        "decrypt",
    ]);
}

/**
 * Get the user's encryption key from localStorage, or generate a new one.
 */
export async function getOrCreateUserKey(): Promise<CryptoKey> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return importKeyFromBase64(stored);
    }
    const key = await generateKey();
    const b64 = await exportKeyToBase64(key);
    localStorage.setItem(STORAGE_KEY, b64);
    return key;
}

/**
 * Export the user's key as a base64 string (for backup).
 */
export async function exportUserKey(): Promise<string> {
    const key = await getOrCreateUserKey();
    return exportKeyToBase64(key);
}

/**
 * Import a key from a base64 string (restore from backup).
 * Overwrites the current key in localStorage.
 */
export async function importUserKey(base64: string): Promise<void> {
    // Validate the key by trying to import it
    await importKeyFromBase64(base64.trim());
    localStorage.setItem(STORAGE_KEY, base64.trim());
}

/**
 * Check if a key exists in localStorage.
 */
export function hasUserKey(): boolean {
    return !!localStorage.getItem(STORAGE_KEY);
}

// ── Encrypt / Decrypt ───────────────────────────────────────────────

/**
 * Encrypt a Blob with AES-256-GCM.
 * Returns a single Blob: [12-byte IV | ciphertext]
 */
export async function encryptBlob(key: CryptoKey, blob: Blob): Promise<Blob> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const plaintext = await blob.arrayBuffer();

    const ciphertext = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        plaintext
    );

    // Prepend IV to ciphertext
    return new Blob([iv, ciphertext], { type: "application/octet-stream" });
}

/**
 * Decrypt a Blob that was encrypted with encryptBlob().
 * Expects format: [12-byte IV | ciphertext]
 * Returns the decrypted Blob as audio/wav.
 */
export async function decryptBlob(key: CryptoKey, encryptedBlob: Blob): Promise<Blob> {
    const data = await encryptedBlob.arrayBuffer();

    const iv = new Uint8Array(data, 0, IV_LENGTH);
    const ciphertext = data.slice(IV_LENGTH);

    const plaintext = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        ciphertext
    );

    return new Blob([plaintext], { type: "audio/wav" });
}

// ── String Encrypt / Decrypt (for notes) ────────────────────────────

/**
 * Encrypt a string with AES-256-GCM.
 * Returns a base64 string: base64([12-byte IV | ciphertext])
 */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        data
    );

    // Combine IV + ciphertext, then base64 encode
    const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), IV_LENGTH);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 string that was encrypted with encryptString().
 * Returns the original plaintext string.
 */
export async function decryptString(key: CryptoKey, encrypted: string): Promise<string> {
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const plaintext = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(plaintext);
}
