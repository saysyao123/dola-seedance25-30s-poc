(() => {
  if (window.__DOLA_SEEDANCE_INSPECTOR_HOOK__) return;
  window.__DOLA_SEEDANCE_INSPECTOR_HOOK__ = true;

  const SECRET_KEY = /(cookie|authorization|token|session|signature|sign|credential|password|passwd|secret|ttwid|web_id|device_id|csrf|verify|fingerprint|\bfp\b)/i;
  const VIDEO_HINT = /(seedance|video|duration|ability_type|ability_param|generation|creation|completion|chat|task|poll|result|vid)/i;
  const API_HINT = /(\/api\/|\/chat\/|\/conversation\/|\/generation\/|\/task\/)/i;
  const MAX_TEXT = 12000;

  function sanitizeText(input) {
    let text = String(input ?? '');
    text = text.replace(/(bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]');
    text = text.replace(/((?:token|sessionid|session_id|signature|sign|authorization|ttwid|s_v_web_id|csrf|verify|fingerprint|device_id|fp)\s*[:=]\s*)[^&\s,}\]]+/gi, '$1[REDACTED]');
    return text.length <= MAX_TEXT ? text : `${text.slice(0, MAX_TEXT)}…[TRUNCATED]`;
  }

  function redactObject(value, depth = 0) {
    if (depth > 12) return '[MAX_DEPTH]';
    if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactObject(item, depth + 1));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, val] of Object.entries(value)) {
        if (SECRET_KEY.test(key)) {
          out[key] = '[REDACTED]';
        } else {
          out[key] = redactObject(val, depth + 1);
        }
      }
      return out;
    }
    if (typeof value === 'string') return sanitizeText(value);
    return value;
  }

  function sanitizeUrl(input) {
    try {
      const url = new URL(String(input), location.href);
      for (const key of [...url.searchParams.keys()]) {
        if (SECRET_KEY.test(key)) url.searchParams.set(key, '[REDACTED]');
      }
      return sanitizeText(url.toString());
    } catch {
      return sanitizeText(input);
    }
  }

  function parseBody(body) {
    if (body == null) return null;

    if (typeof body === 'string') {
      try {
        return redactObject(JSON.parse(body));
      } catch {
        if (body.includes('=')) {
          try {
            const params = new URLSearchParams(body);
            if ([...params.keys()].length) return redactObject(Object.fromEntries(params.entries()));
          } catch {}
        }
        return sanitizeText(body);
      }
    }

    if (body instanceof URLSearchParams) {
      return redactObject(Object.fromEntries(body.entries()));
    }

    if (body instanceof FormData) {
      const object = {};
      for (const [key, value] of body.entries()) {
        object[key] = typeof value === 'string' ? value : `[File:${value.name}]`;
      }
      return redactObject(object);
    }

    if (body instanceof Blob) return `[Blob:${body.type || 'unknown'}:${body.size}]`;
    if (body instanceof ArrayBuffer) return `[ArrayBuffer:${body.byteLength}]`;

    return sanitizeText(Object.prototype.toString.call(body));
  }

  function shouldCapture(method, url, body) {
    const bodyText = typeof body === 'string'
      ? body
      : (() => {
          try { return JSON.stringify(body); } catch { return ''; }
        })();
    const upperMethod = String(method || 'GET').toUpperCase();
    return VIDEO_HINT.test(String(url)) || VIDEO_HINT.test(bodyText) || API_HINT.test(String(url)) || upperMethod !== 'GET';
  }

  function emit(payload) {
    window.postMessage({ source: 'dola-seedance25-poc', payload }, location.origin);
  }

  function parseResponseText(text, contentType) {
    const sanitized = sanitizeText(text);
    if (!sanitized) return null;
    if (String(contentType || '').includes('json')) {
      try { return redactObject(JSON.parse(sanitized)); } catch {}
    }
    try { return redactObject(JSON.parse(sanitized)); } catch {}
    return sanitized;
  }

  async function captureFetchResponseBody(response, requestMeta, started) {
    try {
      const clone = response.clone();
      const contentType = clone.headers.get('content-type') || '';
      if (!/(json|text|event-stream)/i.test(contentType)) return;
      const text = await clone.text();
      emit({
        kind: 'response',
        transport: 'fetch',
        at: new Date().toISOString(),
        status: response.status,
        url: sanitizeUrl(response.url || requestMeta.url),
        elapsedMs: Date.now() - started,
        contentType,
        body: parseResponseText(text, contentType),
      });
    } catch {
      // The observer must never interfere with the page if a response cannot be cloned/read.
    }
  }

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    const method = init?.method || (typeof input !== 'string' && input?.method) || 'GET';
    const body = init?.body ?? null;
    const parsedBody = parseBody(body);
    const capture = shouldCapture(method, url, parsedBody);
    const started = Date.now();

    if (capture) {
      emit({
        kind: 'request',
        transport: 'fetch',
        at: new Date().toISOString(),
        method,
        url: sanitizeUrl(url),
        body: parsedBody,
      });
    }

    try {
      const response = await originalFetch.apply(this, arguments);
      if (capture) {
        void captureFetchResponseBody(response, { url }, started);
      }
      return response;
    } catch (error) {
      if (capture) {
        emit({
          kind: 'error',
          transport: 'fetch',
          at: new Date().toISOString(),
          url: sanitizeUrl(url),
          message: sanitizeText(error?.message || error),
        });
      }
      throw error;
    }
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this.__dolaSeedanceInspector = { method, url };
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const meta = this.__dolaSeedanceInspector || { method: 'GET', url: '' };
    const parsedBody = parseBody(body);
    const capture = shouldCapture(meta.method, meta.url, parsedBody);
    const started = Date.now();

    if (capture) {
      emit({
        kind: 'request',
        transport: 'xhr',
        at: new Date().toISOString(),
        method: meta.method,
        url: sanitizeUrl(meta.url),
        body: parsedBody,
      });

      this.addEventListener('loadend', () => {
        let responseBody = null;
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            responseBody = parseResponseText(this.responseText || '', this.getResponseHeader('content-type') || '');
          } else if (this.responseType === 'json') {
            responseBody = redactObject(this.response);
          }
        } catch {}

        emit({
          kind: 'response',
          transport: 'xhr',
          at: new Date().toISOString(),
          status: this.status,
          url: sanitizeUrl(this.responseURL || meta.url),
          elapsedMs: Date.now() - started,
          contentType: this.getResponseHeader('content-type') || null,
          body: responseBody,
        });
      }, { once: true });
    }

    return originalSend.apply(this, arguments);
  };
})();
