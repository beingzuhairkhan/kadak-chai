import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 40,
        background: "#4b2618",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 132,
          height: 132,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 66,
          background: "#f3d7a5",
          color: "#4b291c",
          fontSize: 104,
          fontWeight: 900,
        }}
      >
        K
      </div>
    </div>,
    size,
  );
}
