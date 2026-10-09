const Api = (() => {
  let controller;

  /** GET /api<path> → { data, cache }. A newer call aborts an older in-flight one only if `latest` is set. */
  async function get(path, { latest = false } = {}) {
    if (latest) { controller?.abort(); controller = new AbortController(); }
    let res;
    try {
      res = await fetch(`/api${path}`, { signal: latest ? controller.signal : undefined });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new Error('Cannot reach the server.');
    }
    let body = null;
    try { body = await res.json(); } catch { /* non-JSON error */ }
    if (!res.ok) throw new Error(body?.error?.message || `Request failed (${res.status})`);
    const cache = res.headers.get('X-Cache');
    if (cache === 'SNAPSHOT') document.getElementById('offline-badge').hidden = false;
    return { data: body, cache };
  }

  return { get };
})();
