import { parseAiResponse } from './parse';

const valid = {
  decision: 'approved',
  reason: null,
  category: 'funny',
  caption: 'Tea and laughter make today brighter.',
};

describe('parseAiResponse', () => {
  it('accepts a valid response', () => {
    expect(parseAiResponse(JSON.stringify(valid))).toEqual({
      ok: true,
      data: valid,
    });
  });

  it('rejects broken JSON and empty or non-string values without throwing', () => {
    expect(parseAiResponse('{broken')).toEqual({
      ok: false,
      error: 'invalid_json',
    });
    expect(parseAiResponse('')).toEqual({ ok: false, error: 'empty_output' });
    expect(parseAiResponse(null)).toEqual({ ok: false, error: 'empty_output' });
  });

  it('accepts fenced JSON and JSON embedded in prose', () => {
    expect(
      parseAiResponse(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``).ok,
    ).toBe(true);
    expect(parseAiResponse(`Result: ${JSON.stringify(valid)} end`).ok).toBe(
      true,
    );
  });

  it('extracts the first balanced object when later prose contains braces', () => {
    expect(
      parseAiResponse(
        `Result: ${JSON.stringify(valid)} then {"extra":"object"}`,
      ),
    ).toEqual({ ok: true, data: valid });
  });

  it.each([
    { ...valid, category: 'unknown' },
    {
      ...valid,
      caption:
        'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen',
    },
    { ...valid, decision: 'maybe' },
    { ...valid, decision: 'rejected', reason: null },
    { ...valid, extra: true },
  ])('rejects invalid values and shapes', (value) => {
    expect(parseAiResponse(JSON.stringify(value)).ok).toBe(false);
  });
});
