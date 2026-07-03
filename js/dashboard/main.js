/**
 * Dashboard entry — auth gate, hash router, sidebar state.
 *
 * Boot: GET /api/auth/me decides login panel vs. app shell. Any 401 from
 * any later call fires 'auth:required' (see api.js) and drops back to the
 * login panel, which doubles as session-expiry handling.
 *
 * Routes: #/overview (default), #/properties, #/submissions — views render
 * into [data-outlet] and re-render on hashchange.
 */

import { api } from './api.js';
import { escapeHtml, loading } from './ui.js';
import { renderOverview } from './overview.js';
import { renderProperties } from './properties.js';
import { renderSubmissions } from './submissions.js';

const $ = (sel) => document.querySelector(sel);

const loginView = $('[data-view-login]');
const appView = $('[data-view-app]');
const outlet = $('[data-outlet]');

const routes = {
  overview: renderOverview,
  properties: renderProperties,
  submissions: renderSubmissions,
};

function showLogin() {
  appView.hidden = true;
  loginView.hidden = false;
  $('#login-email')?.focus();
}

function showApp(user) {
  $('[data-user-label]').textContent = user.name || user.email;
  loginView.hidden = true;
  appView.hidden = false;
  route();
  refreshBadge();
}

/* ---- Router ---- */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  return { path: routes[path] ? path : 'overview', params: new URLSearchParams(qs || '') };
}

async function route() {
  if (appView.hidden) return;
  const { path, params } = parseHash();

  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  outlet.innerHTML = loading();
  try {
    await routes[path](outlet, params);
  } catch (err) {
    if (err.status === 401) return; // auth:required already handled
    outlet.innerHTML = `<div class="dash-empty">${escapeHtml(err.message)}</div>`;
  }
}

/* ---- Sidebar unread badge ---- */

async function refreshBadge() {
  try {
    const { submissions } = await api.get('/api/admin/metrics');
    const unread = submissions
      .filter((row) => row.status === 'unread')
      .reduce((sum, row) => sum + row.count, 0);
    const badge = $('[data-unread-badge]');
    badge.textContent = String(unread);
    badge.hidden = unread === 0;
  } catch {
    /* cosmetic — never block a view on the badge */
  }
}

/* ---- Login / logout ---- */

$('[data-login-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errEl = $('[data-login-error]');
  const btn = $('[data-login-submit]');
  errEl.hidden = true;
  btn.disabled = true;
  try {
    const { user } = await api.post('/api/auth/login', {
      email: form.email.value,
      password: form.password.value,
    });
    form.reset();
    showApp(user);
  } catch (err) {
    errEl.textContent = err.status === 401 ? 'Incorrect email or password.' : err.message;
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

$('[data-logout]').addEventListener('click', async () => {
  try {
    await api.post('/api/auth/logout');
  } catch {
    /* clearing the cookie failed — still fall through to login */
  }
  showLogin();
});

/* ---- Global wiring ---- */

window.addEventListener('hashchange', route);
window.addEventListener('auth:required', showLogin);
window.addEventListener('dash:badge', refreshBadge);

(async () => {
  try {
    const { user } = await api.get('/api/auth/me');
    showApp(user);
  } catch {
    showLogin();
  }
})();
