import { describe, expect, it } from 'vitest';
import { containsSensitiveMaterial, parseAndRedactJson, redactObject, redactUrl } from '../src/security/redact.js';

describe('redaction', () => {
  it('redacts sensitive query parameters', () => {
    const result = redactUrl('https://www.dola.com/api/test?sessionid=secret&duration=30');
    expect(result).toContain('sessionid=%3CREDACTED%3E');
    expect(result).toContain('duration=30');
    expect(result).not.toContain('secret');
  });

  it('redacts nested sensitive fields while preserving functional fields', () => {
    const result = redactObject({
      model: 'seedance-example',
      duration: 30,
      auth: {
        sessionid: 'abc123',
        signature: 'xyz789',
      },
    });

    expect(result).toEqual({
      model: 'seedance-example',
      duration: 30,
      auth: {
        sessionid: '<REDACTED>',
        signature: '<REDACTED>',
      },
    });
  });

  it('does not store non-json request bodies', () => {
    expect(parseAndRedactJson('plain text form body')).toBe('<NON_JSON_BODY_NOT_STORED>');
  });

  it('detects obviously sensitive serialized material', () => {
    expect(containsSensitiveMaterial({ sessionid: 'anything' })).toBe(true);
    expect(containsSensitiveMaterial({ duration: 30, model: 'x' })).toBe(false);
  });
});
