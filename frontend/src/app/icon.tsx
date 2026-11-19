import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        background: "#4b2618",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 48,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 24,
          background: "#f3d7a5",
          color: "#4b291c",
          fontSize: 38,
          fontWeight: 900,
        }}
      >
        K
      </div>
    </div>,
    size,
  );
}
