import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          color: "white",
          fontFamily: "Geist, system-ui, sans-serif",
          padding: 48,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Hipoteca
          </span>
        </div>
        <span style={{ fontSize: 32, fontWeight: 500, opacity: 0.9 }}>
          Calculadora de Amortización
        </span>
        <span style={{ fontSize: 20, marginTop: 16, opacity: 0.7 }}>
          Sistema francés · Simulador gratuito
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
