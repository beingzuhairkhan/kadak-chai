"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { entryFormSchema } from "@/lib/entry-validation";
import { Language, MessageKey, messages } from "@/lib/i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const MODERATION_POLL_INTERVAL_MS = 2500;
const MODERATION_POLL_ATTEMPTS = 8;
const APPROVED_CONFIRMATION = "Your story is approved. Enjoy your chai poster!";

type SubmissionState = {
  status: "success" | "pending" | "rejected" | "error";
  message: string;
  publicId?: string;
  resultPath?: string;
};

const validationMessageKeys: Record<string, MessageKey> = {
  NAME_LENGTH: "nameLength",
  NAME_CHARACTERS: "nameCharacters",
  CITY_LENGTH: "cityLength",
  INVALID_EMAIL: "invalidEmail",
  INVALID_PHONE: "invalidPhone",
  STORY_REQUIRED: "storyRequired",
  STORY_TOO_LONG: "storyTooLong",
  CONSENT_REQUIRED: "consentRequired",
  CONTACT_REQUIRED: "contactRequired",
};

const initialForm = {
  name: "",
  city: "",
  email: "",
  phone: "",
  story: "",
  consent: false,
  website: "",
};

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("en");
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmissionState | null>(null);
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(
    null,
  );

  const storyCount = [...form.story].length;
  const remaining = 300 - storyCount;
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    void Promise.resolve().then(() => {
      const savedLanguage = localStorage.getItem("chai-language");
      if (savedLanguage === "hi") {
        setLanguage(savedLanguage);
        document.documentElement.lang = savedLanguage;
      }
    });
  }, []);
  const t = (key: MessageKey) => messages[language][key];

  useEffect(() => {
    const publicId = submitState?.publicId;
    if (!publicId || submitState.status !== "pending") return;

    let active = true;
    const pollModeration = async () => {
      for (let attempt = 0; attempt < MODERATION_POLL_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, MODERATION_POLL_INTERVAL_MS),
        );
        if (!active) return;

        try {
          const response = await fetch(
            `${API_URL}/api/v1/entries/${encodeURIComponent(publicId)}`,
            { cache: "no-store" },
          );
          if (!response.ok) continue;

          const result = (await response.json()) as {
            status?: string;
          };
          if (result.status !== "approved" && result.status !== "rejected")
            continue;

          setSubmitState((current) => {
            if (current?.publicId !== publicId || current.status !== "pending")
              return current;
            return {
              ...current,
              status: result.status === "approved" ? "success" : "rejected",
              message:
                result.status === "approved"
                  ? APPROVED_CONFIRMATION
                  : messages[language].rejectedMessage,
            };
          });
          return;
        } catch {
          // A temporary lookup failure should not interrupt moderation polling.
        }
      }

      if (active) {
        setSubmitState((current) =>
          current?.publicId === publicId && current.status === "pending"
            ? { ...current, message: messages[language].savedUnderReview }
            : current,
        );
      }
    };

    void pollModeration();
    return () => {
      active = false;
    };
  }, [submitState?.publicId, submitState?.status, language]);

  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    localStorage.setItem("chai-language", next);
    document.documentElement.lang = next;
  };

  const copyResultLink = async () => {
    if (!submitState?.resultPath) return;
    try {
      await navigator.clipboard.writeText(
        new URL(submitState.resultPath, window.location.origin).toString(),
      );
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  const currentStatus = useMemo(() => {
    if (form.story.trim().length === 0) return messages[language].startStatus;
    if (storyCount > 250) return messages[language].almostStatus;
    return messages[language].readyStatus;
  }, [form.story, storyCount, language]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const result = entryFormSchema.safeParse({
      name: form.name,
      city: form.city,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      story: form.story,
      consent: form.consent,
    });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] || "form");
        nextErrors[key] = validationMessageKeys[issue.message]
          ? t(validationMessageKeys[issue.message])
          : t("genericValidation");
      }
    }
    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitState(null);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setCopyStatus(null);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        story: form.story.trim(),
        consent: true,
        website: form.website,
        startedAt: startedAt.current || Date.now(),
      };

      const response = await fetch(`${API_URL}/api/v1/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as {
        message?: string;
        fieldErrors?: Record<string, string>;
        data?: {
          publicId?: string;
          status?: string;
          resultPath?: string;
        };
      };
      if (!response.ok) {
        if (json.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(json.fieldErrors).map(([field, code]) => [
                field,
                validationMessageKeys[code]
                  ? t(validationMessageKeys[code])
                  : "Please check this field.",
              ]),
            ),
          );
        }
        throw new Error(json?.message || "Something went wrong.");
      }

      const data = json.data || {};
      const status = data.status || "pending_review";
      const publicId = data.publicId;
      setSubmitState({
        status:
          status === "approved"
            ? "success"
            : status === "rejected"
              ? "rejected"
              : "pending",
        message:
          status === "approved"
            ? APPROVED_CONFIRMATION
            : status === "rejected"
              ? t("rejectedMessage")
              : publicId
                ? t("reviewingStory")
                : t("success"),
        publicId,
        resultPath:
          data.resultPath || (publicId ? `/entry/${publicId}` : undefined),
      });
      setForm(initialForm);
      startedAt.current = Date.now();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      setSubmitState({
        status: "error",
        message: errorMessage.includes("already entered")
          ? t("duplicateContact")
          : t("submitError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#d8b995]/60 bg-[#f8f1e7]/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7c4a2c] bg-[#f3d7a5] text-lg font-black text-[#4b291c] sm:h-10 sm:w-10">
              K
            </div>
            <div>
              <p className="text-sm font-black tracking-tight sm:text-lg">
                Kadak Chai Co.
              </p>
              <p className="hidden text-[10px] uppercase tracking-[0.26em] text-[#7b4d30] sm:block">
                #MyChaiBreak
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-[#4b291c] sm:gap-2 md:gap-6">
            <div className="flex rounded-full border border-[#d8b995] p-1 text-xs">
              <button
                type="button"
                onClick={() => chooseLanguage("en")}
                aria-label="English"
                aria-pressed={language === "en"}
                className={`rounded-full px-2 py-1 ${language === "en" ? "bg-[#7a3e2d] text-white" : ""}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => chooseLanguage("hi")}
                aria-label="हिन्दी"
                aria-pressed={language === "hi"}
                className={`rounded-full px-2 py-1 ${language === "hi" ? "bg-[#7a3e2d] text-white" : ""}`}
              >
                हिन्दी
              </button>
            </div>
            <Link
              href="/admin"
              aria-label={t("admin")}
              title={t("admin")}
              className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-full border border-[#7c4a2c] px-2.5 py-1 text-xs font-semibold text-[#4b291c] md:hidden"
            >
              Admin
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <a href="#home">{t("home")}</a>
              <a href="#how-it-works">{t("howItWorks")}</a>
              <a href="#share-story">{t("shareStory")}</a>
              <a
                href="/admin"
                className="rounded-full border border-[#7c4a2c] px-3 py-1.5"
              >
                {t("admin")}
              </a>
            </div>
          </div>
        </nav>
      </header>

      <section
        id="home"
        className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pt-20"
      >
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8b995] bg-[#fffaf4] px-3 py-1 text-sm font-medium text-[#7d4c31]">
            <span className="h-2 w-2 rounded-full bg-[#c96d3d]" />
            {t("fresh")}
          </div>
          <div className="space-y-6">
            <h1 className="max-w-xl text-5xl font-black leading-none tracking-tight text-[#2b1a12] sm:text-6xl">
              {t("hero")}
            </h1>
            <p className="max-w-lg text-lg leading-8 text-[#5e3b2d]">
              {t("heroDescription")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#share-story"
              className="inline-flex items-center justify-center rounded-full bg-[#7a3e2d] px-6 py-3 text-base font-semibold text-[#fff9f3] shadow-lg shadow-[#7a3e2d]/20 transition hover:bg-[#633327]"
            >
              {t("shareStory")}
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-[#7a3e2d] bg-white/55 px-6 py-3 text-base font-semibold text-[#4c271a] transition hover:bg-white/80"
            >
              {t("explore")}
            </a>
          </div>
          <div className="flex items-center gap-8 pt-4 text-sm text-[#604434]">
            <div>
              <p className="text-3xl font-black text-[#2b1a12]">12k+</p>
              <p>{t("storiesShared")}</p>
            </div>
            <div>
              <p className="text-3xl font-black text-[#2b1a12]">4.9/5</p>
              <p>{t("communityLove")}</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[#e7b86f]/40 via-transparent to-[#a9502e]/20 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#d9c3a0] bg-[#fffaf5]/80 p-5 shadow-[0_30px_80px_rgba(76,39,26,0.13)]">
            <div className="rounded-[1.5rem] bg-[#2b1a12] p-5 text-[#f9efe3]">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-[#f0d7a0] px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-[#f0d7a0]">
                  {t("posterLabel")}
                </span>
                <span className="rounded-full bg-[#c66d42] px-2 py-1 text-sm font-medium text-white">
                  #MyChaiBreak
                </span>
              </div>
              <div className="mt-8 rounded-[1.5rem] bg-[#f9efe3] p-5 text-[#2b1a12]">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#7f4e31]">
                  Kadak Chai Co.
                </p>
                <h2 className="mt-4 text-3xl font-black leading-tight">
                  “{t("posterQuote")}”
                </h2>
                <div className="mt-6 flex items-center justify-between text-sm text-[#6d4b39]">
                  <span>{t("family")}</span>
                  <span>•</span>
                  <span>{t("memories")}</span>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between text-sm text-[#f2d9b2]">
                <span>{t("shareMoment")}</span>
                <span>{t("madeForChaiLovers")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8f5b3b]">
            {t("howItWorks")}
          </p>
          <h2 className="mt-3 text-4xl font-black text-[#2b1a12]">
            {t("howWorksTitle")}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            [t("shareStepTitle"), t("shareStepDescription")],
            [t("aiStepTitle"), t("aiStepDescription")],
            [t("captionStepTitle"), t("captionStepDescription")],
            [t("communityStepTitle"), t("communityStepDescription")],
          ].map(([title, description], index) => (
            <div
              key={title}
              className="rounded-[1.5rem] border border-[#dbc8a6] bg-white/65 p-6 shadow-sm"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f2d0a6] text-lg font-black text-[#4f2d1d]">
                0{index + 1}
              </div>
              <h3 className="mb-2 text-xl font-bold">{title}</h3>
              <p className="text-[#5b3d32]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="share-story"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-[#d8b995] bg-[#fffaf5]/80 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#915e3a]">
              {t("campaignInfo")}
            </p>
            <h3 className="mt-4 text-3xl font-black text-[#2b1a12]">
              {t("smallPauses")}
            </h3>
            <p className="mt-4 text-[#5c4137]">{t("campaignDescription")}</p>
            <div className="mt-8 space-y-4 text-sm text-[#4b2d1d]">
              <div className="rounded-2xl bg-[#f7ebd3] p-4">
                <strong>{t("whatCountsLabel")}</strong> {t("whatCountsText")}
              </div>
              <div className="rounded-2xl bg-[#fce2cc] p-4">
                <strong>{t("whatFilteredLabel")}</strong>{" "}
                {t("whatFilteredText")}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-[#d8b995] bg-white/80 p-6 shadow-[0_25px_70px_rgba(75,41,27,0.08)] sm:p-8"
          >
            <label
              aria-hidden="true"
              className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
            >
              {t("hiddenWebsite")}
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </label>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9d673b]">
                  {t("storyFormHeading")}
                </p>
                <h3 className="mt-2 text-3xl font-black text-[#2b1a12]">
                  {t("tellStory")}
                </h3>
              </div>
              <span className="rounded-full border border-[#e0c28c] bg-[#fff7ea] px-3 py-1 text-xs font-semibold text-[#674a38]">
                {currentStatus}
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-semibold text-[#4b2d1d]">
                  {t("fullName")}
                </label>
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl border border-[#d7c0a0] bg-[#fffdf9] px-4 py-3 outline-none ring-0 focus:border-[#9d673b]"
                  placeholder={t("namePlaceholder")}
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-semibold text-[#4b2d1d]">
                  {t("city")}
                </label>
                <input
                  required
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-2xl border border-[#d7c0a0] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#9d673b]"
                  placeholder={t("cityPlaceholder")}
                />
                {errors.city && (
                  <p className="mt-2 text-sm text-red-600">{errors.city}</p>
                )}
              </div>
              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-semibold text-[#4b2d1d]">
                  {t("email")}
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-2xl border border-[#d7c0a0] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#9d673b]"
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-semibold text-[#4b2d1d]">
                  {t("phone")}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-2xl border border-[#d7c0a0] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#9d673b]"
                  placeholder="+91 98765 43210"
                />
                {errors.phone && (
                  <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
              <p className="sm:col-span-2 -mt-3 text-xs text-[#795b48]">
                {t("contactInstruction")}
              </p>
            </div>

            {errors.contact && (
              <p className="mt-2 text-sm text-red-600">{errors.contact}</p>
            )}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-[#4b2d1d]">
                {t("story")}
              </label>
              <textarea
                value={form.story}
                onChange={(e) =>
                  setForm({
                    ...form,
                    story: e.target.value,
                  })
                }
                rows={6}
                className="w-full rounded-2xl border border-[#d7c0a0] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#9d673b]"
                placeholder={t("storyPlaceholder")}
              />
              <div className="mt-2 flex items-center justify-between text-sm text-[#6d4b39]">
                <span>{storyCount}/300</span>
                <span>
                  {remaining} {t("charactersLeft")}
                </span>
              </div>
              {errors.story && (
                <p className="mt-2 text-sm text-red-600">{errors.story}</p>
              )}
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-[#dcc7a4] bg-[#fffaf1] p-3 text-sm text-[#4c291a]">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) =>
                  setForm({ ...form, consent: e.target.checked })
                }
                className="mt-1 h-4 w-4 accent-[#7a3e2d]"
              />
              <span>{t("consent")}</span>
            </label>
            {errors.consent && (
              <p className="mt-2 text-sm text-red-600">{errors.consent}</p>
            )}

            <button
              disabled={isSubmitting}
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#7a3e2d] px-5 py-3 font-semibold text-white shadow-lg shadow-[#7a3e2d]/20 transition hover:bg-[#633327] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? t("submitting") : t("submit")}
            </button>

            {submitState?.status === "success" ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <p className="font-semibold">{APPROVED_CONFIRMATION}</p>
                {submitState.resultPath && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/70 p-3">
                    <button
                      type="button"
                      onClick={() => void copyResultLink()}
                      aria-label={
                        copyStatus === "copied"
                          ? "Link copied"
                          : "Copy result link"
                      }
                      title={
                        copyStatus === "copied"
                          ? "Link copied"
                          : "Copy result link"
                      }
                      className="inline-flex size-10 items-center justify-center rounded-full border border-emerald-700 hover:bg-emerald-100"
                    >
                      {copyStatus === "copied" ? (
                        <Check aria-hidden="true" size={18} />
                      ) : (
                        <Copy aria-hidden="true" size={18} />
                      )}
                    </button>
                    <Link
                      href={submitState.resultPath}
                      aria-label="Open result page"
                      title="Open result page"
                      className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-800 text-white hover:bg-emerald-900"
                    >
                      <ExternalLink aria-hidden="true" size={18} />
                    </Link>
                  </div>
                )}
              </div>
            ) : submitState?.status === "rejected" ? (
              <p className="mt-6 text-sm font-semibold text-amber-900">
                {submitState.message}
              </p>
            ) : submitState ? (
              <div
                className={`mt-6 rounded-2xl border p-4 ${submitState.status === "pending" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-red-200 bg-red-50 text-red-900"}`}
              >
                <p className="font-semibold">{submitState.message}</p>
                {submitState.resultPath && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void copyResultLink()}
                      aria-label={
                        copyStatus === "copied"
                          ? "Link copied"
                          : "Copy result link"
                      }
                      title={
                        copyStatus === "copied"
                          ? "Link copied"
                          : "Copy result link"
                      }
                      className="inline-flex size-10 items-center justify-center rounded-full border border-current bg-white/70 hover:bg-white"
                    >
                      {copyStatus === "copied" ? (
                        <Check aria-hidden="true" size={18} />
                      ) : (
                        <Copy aria-hidden="true" size={18} />
                      )}
                    </button>
                    <Link
                      href={submitState.resultPath}
                      aria-label="Open result page"
                      title="Open result page"
                      className="inline-flex size-10 items-center justify-center rounded-full bg-[#7a3e2d] text-white hover:bg-[#633327]"
                    >
                      <ExternalLink aria-hidden="true" size={18} />
                    </Link>
                  </div>
                )}
                {submitState.resultPath && copyStatus === "failed" && (
                  <p className="mt-2 text-xs">{t("copyFailed")}</p>
                )}
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <footer className="border-t border-[#d8c19c] bg-[#2b1a12] text-[#f5eadb]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xl font-black">Kadak Chai Co.</p>
            <p className="text-sm text-[#e8d3b0]">#MyChaiBreak</p>
          </div>
          <p className="text-sm text-[#f0ddbc]">{t("footerDescription")}</p>
        </div>
      </footer>
    </main>
  );
}
