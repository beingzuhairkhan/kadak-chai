import { z } from "zod";

function codePointLength(value: string) {
  return [...value].length;
}

export function normalizePhone(value: string): string | null {
  const phone = value.trim().replace(/[\s()-]/g, "");
  const indian = phone.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (indian) return `+91${indian[1]}`;
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone;
  return null;
}

const nameSchema = z
  .string()
  .transform((value) => value.trim())
  .superRefine((value, context) => {
    const length = codePointLength(value);
    if (length < 2 || length > 60)
      context.addIssue({ code: "custom", message: "NAME_LENGTH" });
    if (!/^[\p{L}\p{M} .'-]+$/u.test(value))
      context.addIssue({ code: "custom", message: "NAME_CHARACTERS" });
  });

const citySchema = z
  .string()
  .transform((value) => value.trim())
  .superRefine((value, context) => {
    const length = codePointLength(value);
    if (length < 2 || length > 60)
      context.addIssue({ code: "custom", message: "CITY_LENGTH" });
  });

const storySchema = z
  .string()
  .superRefine((value, context) => {
    if (codePointLength(value) > 300) {
      context.addIssue({ code: "custom", message: "STORY_TOO_LONG" });
    }
  })
  .transform((value) =>
    value
      .replace(/\p{Cc}/gu, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  )
  .superRefine((value, context) => {
    if (codePointLength(value) < 1)
      context.addIssue({ code: "custom", message: "STORY_REQUIRED" });
  });

export const entryFormSchema = z
  .object({
    name: nameSchema,
    city: citySchema,
    email: z.string().trim().toLowerCase().email("INVALID_EMAIL").optional(),
    phone: z
      .string()
      .transform((value, context) => {
        const normalized = normalizePhone(value);
        if (!normalized)
          context.addIssue({ code: "custom", message: "INVALID_PHONE" });
        return normalized ?? value;
      })
      .optional(),
    story: storySchema,
    consent: z.literal(true, { error: "CONSENT_REQUIRED" }),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.email && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["contact"],
        message: "CONTACT_REQUIRED",
      });
    }
  });
