(() => {
  if (window.__DOLA_SEEDANCE_POC_HOOK__) return;
  window.__DOLA_SEEDANCE_POC_HOOK__ = true;

  const SECRET_KEY = /(cookie|authorization|token|session|signature|sign|credential|password|passwd|secret|ttwid|web_id|device_id|fp)/i;
  const VIDEO_HINT = /(seedance|video|duration|ability_type|generation|creation|completion|chat)/i;

  function redactObject(value, depth = 0) {
    if (depth > 12) return '[MAX_DEPTH]';
    if (Array.isArray(value)) return value.slice(0, 100).map((v) => redactObject(v, depth + 1));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, val] of Object.entries(value)) {
        out[key] = SECRET_KEY.test(key) ? '[REDACTED]' : redactObject(val, depth + 1);
      }
      return out;
    }
    if (typeof value === 'string' && value.length > 8000) return `${value.slice(0, 8000)}…[TRUNCATED]`;
    return value;
  }

  function sanitizeUrl(input) {
    try {
      const u = new URL(String(input), location.href);
      for (const key of [...u.searchParams.keys()]) {
        if (SECRET_KEY.test(key)) u.searchParams.set(key, '[REDACTED]');
      }
      return u.toString();
    } catch {
      return String(input).slice(0, 1200);
    }
  }

  function parseBody(body) {
    if (body == null) return null;
    if (typeof body === 'string') {
      try { return redactObject(JSON.parse(body)); } catch { return body.length <= 8000 ? body : `${body.slice(0, 8000)}…[TRUNCATED]`; }
    }
    if (body instanceof URLSearchParams) return redactObject(Object.fromEntries(body.entries()));
    if (body instanceof FormData) {
      const obj = {};
      for (const [k, v] of body.entries()) obj[k] = typeof v === 'string' ? v : `[File:${v.name}]`;
      return redactObject(obj);
    }
    return `[${Object.prototype.toString.call(body)}]`;
  }

  function candidate(url, body) {
    const bodyText = typeof body === 'string' ? body : (() => { try { return JSON.stringify(body); } catch { return ''; } })();
    return VIDEO_HINT.test(String(url)) || VIDEO_HINT.test(bodyText);
  }

  function emit(payload) {
    window.postMessage({ source: 'dola-seedance25-poc', payload }, location.origin);
  }

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    const method = init?.method || (typeof input !== 'string' && input?.method) || 'GET';
    const body = init?.body ?? null;
    const parsedBody = parseBody(body);
    const shouldCapture = candidate(url, parsedBody);
    const started = Date.now();

    if (shouldCapture) {
      emit({ kind: 'request', transport: 'fetch', at: new Date().toISOString(), method, url: sanitizeUrl(url), body: parsedBody });
    }

    try {
      const response = await originalFetch.apply(this, arguments);
      if (shouldCapture) {
        emit({ kind: 'response', transport: 'fetch', at: new Date().toISOString(), status: response.status, url: sanitizeUrl(response.url || url), elapsedMs: Date.now() - started, contentType: response.headers.get('content-type') || null });
      }
      return response;
    } catch (error) {
      if (shouldCapture) emit({ kind: 'error', transport: 'fetch', at: new Date().toISOString(), url: sanitizeUrl(url), message: String(error?.message || error) });
      throw error;
    }
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this.__dolaPoc = { method, url };
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const meta = this.__dolaPoc || { method: 'GET', url: '' };
    const parsedBody = parseBody(body);
    const shouldCapture = candidate(meta.url, parsedBody);
    const started = Date.now();
    if (shouldCapture) emit({ kind: 'request', transport: 'xhr', at: new Date().toISOString(), method: meta.method, url: sanitizeUrl(meta.url), body: parsedBody });
    if (shouldCapture) {
      this.addEventListener('loadend', () => {
        emit({ kind: 'response', transport: 'xhr', at: new Date().toISOString(), status: this.status, url: sanitizeUrl(this.responseURL || meta.url), elapsedMs: Date.now() - started, contentType: this.getResponseHeader('content-type') || null });
      }, { once: true });
    }
    return originalSend.apply(this, arguments);
  };
})();
