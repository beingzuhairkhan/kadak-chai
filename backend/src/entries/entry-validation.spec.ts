import { createEntrySchema, normalizePhone } from './entry-validation';
import { entryFormSchema } from '../../../frontend/src/lib/entry-validation';

const entry = {
  name: 'नंदिनी शर्मा',
  city: 'Pune',
  email: 'USER@Example.COM',
  story: 'chai '.repeat(60),
  consent: true,
  website: '',
  startedAt: Date.now() - 5000,
};
const clientEntry = {
  name: entry.name,
  city: entry.city,
  email: entry.email,
  story: entry.story,
  consent: entry.consent,
};

describe('entry validation', () => {
  it('normalizes phone variants and lowercases email consistently on client and server', () => {
    expect(normalizePhone('09876543210')).toBe('+919876543210');
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
    expect(
      createEntrySchema.parse({ ...entry, email: 'USER@Example.COM' })
        .contactValue,
    ).toBe('user@example.com');
    expect(
      entryFormSchema.parse({ ...clientEntry, email: 'USER@Example.COM' })
        .email,
    ).toBe('user@example.com');
  });

  it('counts story emoji by Unicode code point and accepts 300 but rejects 301', () => {
    const story = '😀'.repeat(300);
    expect(createEntrySchema.safeParse({ ...entry, story }).success).toBe(true);
    expect(entryFormSchema.safeParse({ ...clientEntry, story }).success).toBe(
      true,
    );
    expect(
      createEntrySchema.safeParse({ ...entry, story: `${story}😀` }).success,
    ).toBe(false);
    expect(
      entryFormSchema.safeParse({ ...clientEntry, story: `${story}😀` })
        .success,
    ).toBe(false);

    const overlongBeforeNormalization = `${story} `;
    expect(
      createEntrySchema.safeParse({
        ...entry,
        story: overlongBeforeNormalization,
      }).success,
    ).toBe(false);
    expect(
      entryFormSchema.safeParse({
        ...clientEntry,
        story: overlongBeforeNormalization,
      }).success,
    ).toBe(false);
  });

  it('requires literal consent and rejects unknown fields', () => {
    expect(
      createEntrySchema.safeParse({ ...entry, consent: 'true' }).success,
    ).toBe(false);
    expect(
      createEntrySchema.safeParse({ ...entry, extra: 'unexpected' }).success,
    ).toBe(false);
  });

  it('accepts either or both normalized contact methods and requires at least one', () => {
    const bothContacts = createEntrySchema.safeParse({
      ...entry,
      phone: '+91 98765 43210',
    });
    expect(bothContacts.success).toBe(true);
    if (bothContacts.success) {
      expect(bothContacts.data.email).toBe('user@example.com');
      expect(bothContacts.data.phone).toBe('+919876543210');
    }

    expect(
      entryFormSchema.safeParse({
        ...clientEntry,
        phone: '+91 98765 43210',
      }).success,
    ).toBe(true);
    expect(
      createEntrySchema.safeParse({
        ...entry,
        email: undefined,
        phone: '+91 98765 43210',
      }).success,
    ).toBe(true);
    expect(
      createEntrySchema.safeParse({ ...entry, phone: '+91 98765 43210' })
        .success,
    ).toBe(true);
    expect(
      createEntrySchema.safeParse({
        ...entry,
        email: undefined,
        phone: undefined,
      }).success,
    ).toBe(false);
    expect(
      entryFormSchema.safeParse({
        ...clientEntry,
        email: undefined,
        phone: undefined,
      }).success,
    ).toBe(false);
  });
});
