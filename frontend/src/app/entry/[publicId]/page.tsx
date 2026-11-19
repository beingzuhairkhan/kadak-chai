import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShareStoryButton } from "./share-story-button";

type Props = { params: Promise<{ publicId: string }> };
type PublicEntry = {
  publicId: string;
  name: string;
  city: string;
  story: string;
  status: "approved" | "rejected" | "pending_review";
  category: string | null;
  caption: string | null;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function getEntry(publicId: string): Promise<PublicEntry | null> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/entries/${encodeURIComponent(publicId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const value: unknown = await response.json();
    if (
      typeof value !== "object" ||
      value === null ||
      !("name" in value) ||
      !("publicId" in value) ||
      !("city" in value) ||
      !("story" in value) ||
      !("status" in value) ||
      typeof value.name !== "string" ||
      typeof value.publicId !== "string" ||
      typeof value.city !== "string" ||
      typeof value.story !== "string" ||
      (value.status !== "approved" &&
        value.status !== "rejected" &&
        value.status !== "pending_review")
    )
      return null;
    return {
      publicId: value.publicId,
      name: value.name,
      city: value.city,
      story: value.story,
      status: value.status,
      category:
        "category" in value && typeof value.category === "string"
          ? value.category
          : null,
      caption:
        "caption" in value && typeof value.caption === "string"
          ? value.caption
          : null,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params;
  const entry = await getEntry(publicId);
  const isApproved = entry?.status === "approved";
  const title = entry ? `${entry.name}'s Chai Break` : "A Chai Break Story";
  const description = isApproved
    ? entry.caption?.slice(0, 160) || "A little moment made better with chai."
    : "This chai story is saved and under review.";
  const url = new URL(`/entry/${encodeURIComponent(publicId)}`, siteUrl);
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Kadak Chai Co.`,
      description,
      url,
      type: "website",
      images: [
        {
          url: `/entry/${encodeURIComponent(publicId)}/opengraph-image`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Kadak Chai Co.`,
      description,
      images: [`/entry/${encodeURIComponent(publicId)}/opengraph-image`],
    },
    robots: isApproved
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

async function StoryContent({ params }: Props) {
  const { publicId } = await params;
  const entry = await getEntry(publicId);
  if (!entry) notFound();
  const approved = entry.status === "approved" && Boolean(entry.caption);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f1e7] px-4 py-10 text-[#2b1a12]">
      <article className="relative w-full max-w-xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#4b2618] via-[#8d4b2d] to-[#d7a762] p-1 shadow-[0_30px_90px_rgba(75,41,27,.24)]">
        <div className="rounded-[1.8rem] bg-[#fff9f0] px-6 py-10 text-center sm:px-12 sm:py-14">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#f4e7c9] text-xl font-black text-[#8d4b2d]">
            K
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[.3em] text-[#8d4b2d]">
            Kadak Chai Co.
          </p>
          <p className="mt-2 text-sm font-semibold text-[#a87834]">
            #MyChaiBreak
          </p>
          {approved ? (
            <>
              <h1 className="mt-10 text-4xl font-black leading-tight tracking-tight text-[#3d2116] sm:text-5xl">
                “{entry.caption}”
              </h1>
              <span className="mt-7 inline-flex rounded-full bg-[#f4e7c9] px-4 py-2 text-sm font-bold capitalize text-[#795b32]">
                {entry.category || "chai moment"}
              </span>
              <p className="mt-6 text-lg font-semibold text-[#6b4936]">
                — {entry.name}, {entry.city}
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-10 text-3xl font-black leading-tight tracking-tight text-[#3d2116]">
                {entry.status === "rejected"
                  ? "Thanks for sharing your story"
                  : "Your story is under review"}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-[#6b4936]">
                “{entry.story}”
              </p>
              <p className="mt-5 font-semibold text-[#6b4936]">
                — {entry.name}, {entry.city}
              </p>
              <p className="mt-5 text-sm text-[#795b48]">
                {entry.status === "rejected"
                  ? "This story could not be approved for the campaign."
                  : "Your story is saved. Please check back later for its review status."}
              </p>
            </>
          )}
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            {approved && <ShareStoryButton />}
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#8d4b2d] px-6 py-3 text-sm font-bold text-[#7a3e2d] hover:bg-[#fcf1de]"
            >
              Share your own story
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}

export default function StoryPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8f1e7] text-[#795b48]">
          Preparing your chai poster…
        </main>
      }
    >
      <StoryContent params={params} />
    </Suspense>
  );
}
