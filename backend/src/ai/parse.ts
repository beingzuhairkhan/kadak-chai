import { aiResponseSchema, AiResponse } from './ai-response.schema';

export type ParseResult =
  { ok: true; data: AiResponse } | { ok: false; error: string };

function firstJsonObject(value: string) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (start < 0) {
      if (character === '{') {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }
  return null;
}

export function parseAiResponse(raw: unknown): ParseResult {
  try {
    if (typeof raw !== 'string' || !raw.trim()) {
      return { ok: false, error: 'empty_output' };
    }

    const unfenced = raw.replace(/```(?:json)?/gi, '').trim();
    const candidate = firstJsonObject(unfenced) || unfenced;
    let value: unknown;
    try {
      value = JSON.parse(candidate);
    } catch {
      return { ok: false, error: 'invalid_json' };
    }

    const validated = aiResponseSchema.safeParse(value);
    if (!validated.success) return { ok: false, error: 'invalid_shape' };
    return { ok: true, data: validated.data };
  } catch {
    return { ok: false, error: 'invalid_response' };
  }
}
