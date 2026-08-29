const SENSITIVE_KEY = /(^|[_-])(cookie|authorization|token|session|sessionid|ttwid|web[_-]?id|device[_-]?id|user[_-]?id|uid|signature|sign|fp|csrf|xsrf|trace[_-]?id)([_-]|$)/i;

const SENSITIVE_QUERY_KEY = /^(cookie|authorization|token|session|sessionid|ttwid|s_v_web_id|web_id|device_id|user_id|uid|signature|sign|fp|csrf|xsrf)$/i;

const SECRETISH_VALUE = /^(bearer\s+)?[A-Za-z0-9_\-.=+/]{40,}$/i;

export function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    for (const [key, value] of url.searchParams.entries()) {
      if (SENSITIVE_QUERY_KEY.test(key) || SECRETISH_VALUE.test(value)) {
        url.searchParams.set(key, '<REDACTED>');
      }
    }
    return url.toString();
  } catch {
    return '<INVALID_URL>';
  }
}

export function redactObject(value: unknown, depth = 0): unknown {
  if (depth > 30) return '<MAX_DEPTH>';
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) {
        output[key] = '<REDACTED>';
      } else {
        output[key] = redactObject(item, depth + 1);
      }
    }
    return output;
  }

  if (typeof value === 'string') {
    if (SECRETISH_VALUE.test(value)) return '<REDACTED_LONG_VALUE>';
    return value;
  }

  return value;
}

export function parseAndRedactJson(text: string | null): unknown {
  if (!text) return null;
  try {
    return redactObject(JSON.parse(text));
  } catch {
    return '<NON_JSON_BODY_NOT_STORED>';
  }
}

export function containsSensitiveMaterial(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return /(sessionid|ttwid|s_v_web_id|authorization|cookie|bearer\s+[A-Za-z0-9])/i.test(serialized);
}
