import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Generates the browser tab favicon as a dark slate square with "PPL" text.
export default function Icon() {
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
          borderRadius: "6px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "-0.5px",
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
