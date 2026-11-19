import { ImageResponse } from "next/og";

export const alt = "Kadak Chai Co. chai break story";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ publicId: string }> };

export default async function OpenGraphImage({ params }: Props) {
  const { publicId } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  let name = "A chai break";
  let caption = "A little moment made better with chai.";
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/entries/${encodeURIComponent(publicId)}`,
      { cache: "no-store" },
    );
    if (response.ok) {
      const data: unknown = await response.json();
      if (
        typeof data === "object" &&
        data !== null &&
        "status" in data &&
        data.status === "approved"
      ) {
        if ("name" in data && typeof data.name === "string")
          name = data.name.slice(0, 60);
        if ("caption" in data && typeof data.caption === "string")
          caption = data.caption.slice(0, 180);
      }
    }
  } catch {
    // Keep the generic image when the public entry is unavailable.
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg,#4b2618,#8d4b2d 55%,#d7a762)",
        color: "#fff9f0",
        padding: 70,
        textAlign: "center",
      }}
    >
      <div
        style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase" }}
      >
        Kadak Chai Co. · #MyChaiBreak
      </div>
      <div
        style={{
          marginTop: 55,
          fontSize: 62,
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: 1000,
        }}
      >
        {caption}
      </div>
      <div style={{ marginTop: 35, fontSize: 34 }}>— {name}</div>
    </div>,
    size,
  );
}
