/**
 * Input validation helpers for Convex mutations.
 * Prevents excessively large string inputs from consuming storage/memory.
 */

// ── String length limits ────────────────────────────────────────────
export const MAX_TITLE_LENGTH = 500;           // titles, names
export const MAX_CONTENT_LENGTH = 500_000;     // note content, transcriptions (~500KB)
export const MAX_DESCRIPTION_LENGTH = 2_000;   // descriptions, summaries
export const MAX_MESSAGE_LENGTH = 50_000;      // chat messages

export function validateStringLength(
    value: string | undefined,
    maxLength: number,
    fieldName: string
): void {
    if (value !== undefined && value.length > maxLength) {
        throw new Error(
            `${fieldName} exceeds maximum length (${value.length}/${maxLength})`
        );
    }
}
