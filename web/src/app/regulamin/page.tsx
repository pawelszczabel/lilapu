export default function Regulamin() {
    return (
        <div className="landing" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{ maxWidth: 700, textAlign: "center" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
                    Regulamin
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
                    Treść regulaminu zostanie uzupełniona wkrótce.
                </p>
                <a href="/" style={{ color: "var(--accent)", marginTop: "2rem", display: "inline-block" }}>← Wróć na stronę główną</a>
            </div>
        </div>
    );
}
