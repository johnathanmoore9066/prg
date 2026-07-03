/**
 * Dashboard fetch wrapper — JSON in/out, typed errors, and a global
 * 'auth:required' event on any 401 so main.js can drop back to the
 * login view from anywhere (expired session, revoked user).
 */

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const opts = { method };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new ApiError(0, 'Network error — check your connection.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response body */
  }

  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:required'));
  }
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
