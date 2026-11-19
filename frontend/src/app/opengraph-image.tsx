import { ImageResponse } from "next/og";

export const alt = "Kadak Chai Co. — Every Chai Break Has a Story";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #4b2618 0%, #8d4b2d 55%, #d7a762 100%)",
        color: "#fff9f0",
        padding: 70,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 30, letterSpacing: 8, textTransform: "uppercase" }}>
        Kadak Chai Co. · #MyChaiBreak
      </div>
      <div
        style={{
          marginTop: 44,
          fontSize: 74,
          fontWeight: 800,
          lineHeight: 1.12,
          maxWidth: 1000,
        }}
      >
        Every Chai Break Has a Story.
      </div>
      <div style={{ marginTop: 34, fontSize: 32 }}>
        Share the little moments that make a day.
      </div>
    </div>,
    size,
  );
}
