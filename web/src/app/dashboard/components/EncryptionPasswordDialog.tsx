"use client";

import { useState } from "react";

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Hasło musi mieć minimum 6 znaków");
            return;
        }

        if (confirmPassword && password !== confirmPassword) {
            setError("Hasła nie są identyczne");
            return;
        }

        setIsLoading(true);
        try {
            const { deriveKeyFromPassword } = await import("../crypto");
            await deriveKeyFromPassword(email, password);
            onKeyReady();
        } catch {
            setError("Nie udało się wygenerować klucza. Spróbuj ponownie.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="encryption-dialog-overlay">
            <div className="encryption-dialog">
                <div className="encryption-dialog-icon">🔐</div>
                <h2>Hasło szyfrowania</h2>
                <p className="encryption-dialog-desc">
                    Twoje nagrania i notatki są szyfrowane end-to-end.
                    Podaj hasło szyfrowania, aby uzyskać dostęp do swoich danych.
                </p>
                <p className="encryption-dialog-hint">
                    To samo hasło na każdym urządzeniu = dostęp do wszystkich danych.
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Hasło szyfrowania"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        className="encryption-input"
                    />
                    <input
                        type="password"
                        placeholder="Potwierdź hasło (opcjonalne)"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="encryption-input"
                    />

                    {error && <p className="encryption-error">{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading || !password}
                        className="encryption-submit"
                    >
                        {isLoading ? "Generowanie klucza..." : "🔓 Odblokuj dane"}
                    </button>
                </form>

                <p className="encryption-dialog-footer">
                    ⚠️ Nie da się odzyskać hasła szyfrowania. Zapamiętaj je dobrze!
                </p>
            </div>
        </div>
    );
}
