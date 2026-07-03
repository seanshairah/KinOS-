"use client";

/**
 * The last-resort boundary. If the shell itself fails, the family still
 * sees calm — and one honest button.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1B1836",
          color: "#EDEBF6",
          fontFamily: "Georgia, serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <p style={{ fontSize: 28, fontStyle: "italic", fontWeight: 300, margin: 0 }}>
            Something slipped. Nothing is lost.
          </p>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 12 }}>
            The family record is safe. Try again in a moment.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(169,167,224,.5)",
              background: "transparent",
              color: "#EDEBF6",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
