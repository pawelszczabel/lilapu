"use client";

import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Landing page — redirects authenticated users to /dashboard.
 * Shows Clerk sign-in/sign-up for unauthenticated users.
 */
export default function LandingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      router.push("/dashboard");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="login-page">
        <div className="login-logo">Lilapu</div>
        <p className="login-subtitle">Ładowanie...</p>
      </div>
    );
  }

  if (user) return null; // redirecting

  return (
    <div className="login-page">
      <div className="login-logo">Lilapu</div>
      <p className="login-subtitle">Twój prywatny notatnik z AI</p>

      <div className="login-card">
        <h2>Witaj</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Szyfrowane nagrania, transkrypcje i notatki. Twoje dane, Twój klucz.
        </p>

        <SignInButton mode="modal">
          <button className="btn btn-primary btn-full">
            🔑 Zaloguj się
          </button>
        </SignInButton>

        <div className="login-divider">lub</div>

        <SignUpButton mode="modal">
          <button className="btn btn-google btn-full">
            ✨ Utwórz konto
          </button>
        </SignUpButton>

        <a href="/waitlist" className="btn btn-secondary btn-full" style={{ marginTop: '12px' }}>
          📩 Dołącz do waitlisty
        </a>
      </div>
    </div>
  );
}
