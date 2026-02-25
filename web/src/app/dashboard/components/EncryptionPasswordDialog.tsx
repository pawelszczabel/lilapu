"use client";

import { useState, useRef, useCallback } from "react";
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
    const [isLocked, setIsLocked] = useState(false);
    const [lockSeconds, setLockSeconds] = useState(0);

    // Brute-force protection: progressive delay
    const failCountRef = useRef(0);
    const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startLockout = useCallback((seconds: number) => {
        setIsLocked(true);
        setLockSeconds(seconds);
        if (lockTimerRef.current) clearInterval(lockTimerRef.current);
        lockTimerRef.current = setInterval(() => {
            setLockSeconds((prev) => {
                if (prev <= 1) {
                    setIsLocked(false);
                    if (lockTimerRef.current) clearInterval(lockTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // Check if user already has a verification token (existing user)
    const existingToken = useQuery(api.userKeys.getVerificationToken);
    const setVerificationToken = useMutation(api.userKeys.setVerificationToken);

    const isNewUser = existingToken === null;
    const isTokenLoading = existingToken === undefined;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (isLocked) return;

        if (password.length < 12) {
            setError("Hasło musi mieć minimum 12 znaków");
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
                await setVerificationToken({ verificationToken: token });
                onKeyReady();
            } else if (existingToken) {
                // Existing user — verify password
                const isValid = await verifyKey(key, existingToken);
                if (isValid) {
                    failCountRef.current = 0;
                    onKeyReady();
                } else {
                    // Wrong password — apply progressive delay
                    failCountRef.current += 1;
                    const { clearSessionKey } = await import("../crypto");
                    clearSessionKey();

                    if (failCountRef.current >= 10) {
                        startLockout(300); // 5 minutes
                        setError("Zbyt wiele nieudanych prób. Spróbuj ponownie za 5 minut.");
                    } else if (failCountRef.current >= 3) {
                        const delaySec = Math.min(2 ** (failCountRef.current - 2), 60);
                        startLockout(delaySec);
                        setError(`Złe hasło szyfrowania. Następna próba za ${delaySec}s.`);
                    } else {
                        setError("Złe hasło szyfrowania. Spróbuj ponownie.");
                    }
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
                        disabled={isLoading || !password || isLocked}
                        className="encryption-submit"
                    >
                        {isLocked
                            ? `⏳ Zablokowane (${lockSeconds}s)`
                            : isLoading
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
