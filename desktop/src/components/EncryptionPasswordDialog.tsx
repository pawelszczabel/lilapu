

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";

interface EncryptionPasswordDialogProps {
    email: string;
    onKeyReady: () => void;
}

// ── Stepper Component ────────────────────────────────────────────────

function OnboardingStepper({ currentStep }: { currentStep: number }) {
    const steps = [
        { label: "Konto", icon: "👤" },
        { label: "Szyfrowanie", icon: "🔒" },
        { label: "Gotowe!", icon: "🚀" },
    ];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0',
            marginBottom: '24px',
            padding: '0 16px',
        }}>
            {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: '70px',
                    }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            background: i < currentStep
                                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                : i === currentStep
                                    ? 'linear-gradient(135deg, #7c5cfc, #6d28d9)'
                                    : 'rgba(255,255,255,0.06)',
                            border: i === currentStep
                                ? '2px solid rgba(124, 92, 252, 0.5)'
                                : '2px solid transparent',
                            transition: 'all 0.3s ease',
                            boxShadow: i === currentStep
                                ? '0 0 12px rgba(124, 92, 252, 0.3)'
                                : 'none',
                        }}>
                            {i < currentStep ? '✓' : step.icon}
                        </div>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: i === currentStep ? 600 : 400,
                            color: i <= currentStep
                                ? 'var(--text-primary, #fff)'
                                : 'var(--text-muted, #666)',
                            transition: 'all 0.3s ease',
                        }}>
                            {step.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div style={{
                            width: '40px',
                            height: '2px',
                            background: i < currentStep
                                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                : 'rgba(255,255,255,0.1)',
                            marginBottom: '20px',
                            transition: 'all 0.3s ease',
                        }} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Main Dialog ──────────────────────────────────────────────────────

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
                <OnboardingStepper currentStep={1} />

                <div className="encryption-dialog-icon">{isNewUser ? "🔒" : "🔐"}</div>
                <h2>{isNewUser ? "Utwórz hasło szyfrowania" : "Odblokuj dane"}</h2>
                <p className="encryption-dialog-desc">
                    {isNewUser
                        ? "Twoje nagrania i notatki będą szyfrowane end-to-end. Wymyśl unikalne hasło — tylko Ty będziesz mieć dostęp do swoich danych. To NIE jest hasło do logowania."
                        : "Twoje dane są zaszyfrowane. Podaj hasło szyfrowania, które ustawiłeś przy pierwszym logowaniu."}
                </p>
                {isNewUser && (
                    <p className="encryption-dialog-hint">
                        💡 Użyj tego samego hasła na każdym urządzeniu, aby mieć dostęp do tych samych danych.
                    </p>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder={isNewUser ? "Wymyśl hasło (min. 12 znaków)" : "Hasło szyfrowania"}
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
                                    ? "🔒 Ustaw hasło i przejdź dalej →"
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
