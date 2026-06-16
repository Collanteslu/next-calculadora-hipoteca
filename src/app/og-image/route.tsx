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
          background: "linear-gradient(135deg, #B84A2D 0%, #8B3A1F 50%, #5C2410 100%)",
          color: "#FAF7F2",
          fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
          padding: 56,
        }}
      >
        {/* Subtle geometric pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 20% 80%, rgba(245,185,110,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,185,110,0.05) 0%, transparent 50%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28, position: "relative" }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#F5B96E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.025em", color: "#FAF7F2" }}>
            Hipoteca
          </span>
        </div>
        <span style={{ fontSize: 34, fontWeight: 500, opacity: 0.9, color: "#F5DCC3", letterSpacing: "-0.01em", position: "relative" }}>
          Calculadora de Amortización
        </span>
        <span style={{ fontSize: 20, marginTop: 20, opacity: 0.6, color: "#F5B96E", position: "relative" }}>
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
