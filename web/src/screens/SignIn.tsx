export default function SignIn() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        background: "var(--bg)",
      }}
    >
      {/* LEFT brand panel */}
      <div
        style={{
          flex: 1,
          padding: "60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "var(--surface)",
          position: "relative",
          overflow: "hidden",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Dotted texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.55,
            pointerEvents: "none",
          }}
        />

        {/* Top: F-mark + Folio */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1c1408",
              font: "700 19px/1 'Newsreader', serif",
              flexShrink: 0,
            }}
          >
            F
          </div>
          <span
            style={{
              font: "600 19px/1 'Newsreader', serif",
              color: "var(--text)",
            }}
          >
            Folio
          </span>
        </div>

        {/* Middle: H1 + sub + features */}
        <div style={{ position: "relative" }}>
          <h1
            style={{
              font: "600 44px/1.12 'Newsreader', serif",
              color: "var(--text)",
              margin: "0 0 18px",
              maxWidth: "460px",
              letterSpacing: "-0.015em",
            }}
          >
            Your notes, finally in one calm place.
          </h1>
          <p
            style={{
              font: "400 17px/1.6 'Newsreader', serif",
              color: "var(--text-2)",
              maxWidth: "410px",
              margin: 0,
            }}
          >
            Capture what you learn, organize it into folders and tags, and find any thought
            in seconds.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              marginTop: "36px",
            }}
          >
            {[
              "A rich editor with slash commands",
              "Folders, tags & full-text search",
              "Yours, and private by default",
            ].map((label) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: "13px" }}
              >
                <span
                  style={{
                    width: "27px",
                    height: "27px",
                    borderRadius: "8px",
                    background: "var(--accent-soft)",
                    color: "var(--accent-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                  >
                    <path d="M5 12l5 5L20 6" />
                  </svg>
                </span>
                <span
                  style={{
                    font: "500 14.5px/1.3 'Schibsted Grotesk', sans-serif",
                    color: "var(--text)",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: copyright */}
        <div
          style={{
            position: "relative",
            font: "500 13px/1 'Schibsted Grotesk', sans-serif",
            color: "var(--text-3)",
          }}
        >
          © 2026 Folio
        </div>
      </div>

      {/* RIGHT form panel */}
      <div
        style={{
          width: "480px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "340px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2
            style={{
              font: "600 27px/1.2 'Schibsted Grotesk', sans-serif",
              color: "var(--text)",
              margin: "0 0 8px",
            }}
          >
            Sign in
          </h2>
          <p
            style={{
              font: "400 15px/1.5 'Schibsted Grotesk', sans-serif",
              color: "var(--text-2)",
              margin: "0 0 32px",
            }}
          >
            Welcome back. Continue to your workspace.
          </p>

          {/* Continue with Google */}
          <button
            onClick={() => {
              window.location.href = "/api/auth/google";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "13px",
              borderRadius: "11px",
              background: "#ffffff",
              border: "1px solid #dadce0",
              color: "#1f1f1f",
              font: "600 15px/1 'Schibsted Grotesk', sans-serif",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,.1)",
            }}
          >
            {/* Google G SVG */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Continue with Google
          </button>

          {/* OR divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              margin: "22px 0",
            }}
          >
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
            <span
              style={{
                font: "500 11px/1 'Schibsted Grotesk', sans-serif",
                letterSpacing: ".06em",
                color: "var(--text-3)",
              }}
            >
              OR
            </span>
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
          </div>

          {/* Continue with email — disabled */}
          <button
            disabled
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "13px",
              borderRadius: "11px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text)",
              font: "600 15px/1 'Schibsted Grotesk', sans-serif",
              cursor: "not-allowed",
              opacity: 0.6,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            Continue with email
          </button>

          {/* Fine print */}
          <p
            style={{
              font: "400 12.5px/1.6 'Schibsted Grotesk', sans-serif",
              color: "var(--text-3)",
              margin: "28px 0 0",
              textAlign: "center",
            }}
          >
            By continuing you agree to the{" "}
            <a
              href="#"
              style={{ color: "var(--text-2)", textDecoration: "underline" }}
            >
              Terms
            </a>{" "}
            &amp;{" "}
            <a
              href="#"
              style={{ color: "var(--text-2)", textDecoration: "underline" }}
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
