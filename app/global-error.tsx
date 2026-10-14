"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          margin: 0,
          padding: "4rem 1.5rem",
          textAlign: "center",
          color: "#0f172a",
        }}
      >
        <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#475569" }}>
          The page hit an unexpected error. Nothing was uploaded anywhere.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1rem",
            padding: "0.6rem 1.2rem",
            borderRadius: "0.75rem",
            border: 0,
            background: "#7c3aed",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
