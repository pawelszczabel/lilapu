"use client";

/**
 * E2EE Crypto module for Lilapu.
 *
 * Uses Web Crypto API (AES-256-GCM) to encrypt/decrypt audio blobs and strings.
 * Key is derived from user's email + encryption password via PBKDF2.
 * Same email + password on any device = same key = access to all data.
 *
 * Key storage: sessionStorage ("lilapu_derived_key") — cleared when tab closes.
 */

const SESSION_KEY = "lilapu_derived_key";
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const PBKDF2_ITERATIONS = 100_000;

// ── Key Derivation ─────────────────────────────────────────────────

/**
 * Derive a deterministic AES-256 key from email + password using PBKDF2.
 * Same inputs = same key on every device.
 */
export async function deriveKeyFromPassword(
    email: string,
    password: string
): Promise<CryptoKey> {
    const encoder = new TextEncoder();

    // Import password as PBKDF2 key material
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    // Use SHA-256(email) as deterministic salt
    const saltData = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(email.toLowerCase().trim())
    );

    // Derive AES-256-GCM key
    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: new Uint8Array(saltData),
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        true, // extractable for session storage
        ["encrypt", "decrypt"]
    );

    // Store in sessionStorage for this tab session
    const exported = await exportKeyToBase64(key);
    sessionStorage.setItem(SESSION_KEY, exported);

    return key;
}

// ── Key Management ──────────────────────────────────────────────────

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
 * Get the current session key. Returns null if not yet derived.
 */
export async function getSessionKey(): Promise<CryptoKey | null> {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
        return await importKeyFromBase64(stored);
    } catch {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
    }
}

/**
 * Check if the user has an active encryption key in this session.
 */
export function hasSessionKey(): boolean {
    return !!sessionStorage.getItem(SESSION_KEY);
}

/**
 * Clear the session key (logout).
 */
export function clearSessionKey(): void {
    sessionStorage.removeItem(SESSION_KEY);
}

// ── Session key helper (throws if not available) ────────────────────

/**
 * Get the current session key, throwing if not available.
 * Use this in components that require encryption.
 */
export async function getSessionKeyOrThrow(): Promise<CryptoKey> {
    const key = await getSessionKey();
    if (key) return key;
    throw new Error("NO_ENCRYPTION_KEY");
}

// ── Password Verification ───────────────────────────────────────────

const VERIFICATION_PLAINTEXT = "LILAPU_E2EE_OK";

/**
 * Generate a verification token from a key.
 * Store this token in the DB to later verify the password is correct.
 */
export async function generateVerificationToken(key: CryptoKey): Promise<string> {
    return encryptString(key, VERIFICATION_PLAINTEXT);
}

/**
 * Verify that a key matches a previously generated verification token.
 * Returns true if the key decrypts the token to the expected plaintext.
 */
export async function verifyKey(key: CryptoKey, token: string): Promise<boolean> {
    try {
        const decrypted = await decryptString(key, token);
        return decrypted === VERIFICATION_PLAINTEXT;
    } catch {
        return false;
    }
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
