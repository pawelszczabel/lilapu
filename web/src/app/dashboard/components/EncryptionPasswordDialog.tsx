"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

interface EncryptionPasswordDialogProps {
    email: string;
    onKeyReady: () => void;
}

export default function EncryptionPasswordDialog({
    email,
    onKeyReady,
}: EncryptionPasswordDialogProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Check if user already has a verification token (existing user)
    const existingToken = useQuery(api.userKeys.getVerificationToken, { userId: email });
    const setVerificationToken = useMutation(api.userKeys.setVerificationToken);

    const isNewUser = existingToken === null;
    const isTokenLoading = existingToken === undefined;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Hasło musi mieć minimum 6 znaków");
            return;
        }

        // New user: require password confirmation
        if (isNewUser && confirmPassword !== password) {
            setError("Hasła nie są identyczne");
            return;
        }

        setIsLoading(true);
        try {
            const { deriveKeyFromPassword, generateVerificationToken, verifyKey } = await import("../crypto");
            const key = await deriveKeyFromPassword(email, password);

            if (isNewUser) {
                // First time — generate and store verification token
                const token = await generateVerificationToken(key);
                await setVerificationToken({ userId: email, verificationToken: token });
                onKeyReady();
            } else if (existingToken) {
                // Existing user — verify password
                const isValid = await verifyKey(key, existingToken);
                if (isValid) {
                    onKeyReady();
                } else {
                    // Wrong password — clear the bad key from session
                    const { clearSessionKey } = await import("../crypto");
                    clearSessionKey();
                    setError("Złe hasło szyfrowania. Spróbuj ponownie.");
                }
            }
        } catch {
            setError("Nie udało się wygenerować klucza. Spróbuj ponownie.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isTokenLoading) {
        return (
            <div className="encryption-dialog-overlay">
                <div className="encryption-dialog">
                    <div className="encryption-dialog-icon">⏳</div>
                    <p>Sprawdzanie stanu szyfrowania...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="encryption-dialog-overlay">
            <div className="encryption-dialog">
                <div className="encryption-dialog-icon">🔐</div>
                <h2>Hasło szyfrowania</h2>
                <p className="encryption-dialog-desc">
                    Twoje nagrania i notatki są szyfrowane end-to-end.
                    {isNewUser
                        ? " Ustaw hasło szyfrowania, aby chronić swoje dane."
                        : " Podaj hasło szyfrowania, aby uzyskać dostęp do swoich danych."}
                </p>
                {isNewUser && (
                    <p className="encryption-dialog-hint">
                        To samo hasło na każdym urządzeniu = dostęp do wszystkich danych.
                    </p>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Hasło szyfrowania"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        className="encryption-input"
                    />
                    {isNewUser && (
                        <input
                            type="password"
                            placeholder="Potwierdź hasło"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="encryption-input"
                        />
                    )}

                    {error && <p className="encryption-error">{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading || !password}
                        className="encryption-submit"
                    >
                        {isLoading
                            ? "Weryfikacja..."
                            : isNewUser
                                ? "🔒 Ustaw hasło"
                                : "🔓 Odblokuj dane"}
                    </button>
                </form>

                <p className="encryption-dialog-footer">
                    ⚠️ Nie da się odzyskać hasła szyfrowania. Zapamiętaj je dobrze!
                </p>
            </div>
        </div>
    );
}
