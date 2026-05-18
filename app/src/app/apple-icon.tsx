import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Generates the iOS home screen icon (apple-touch-icon).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "64px",
            fontWeight: "bold",
            letterSpacing: "-3px",
            fontFamily: "Arial",
          }}
        >
          PPL
        </span>
      </div>
    ),
    { ...size },
  );
}
