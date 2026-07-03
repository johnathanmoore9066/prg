/**
 * Overview — headline metrics, per-form-type status breakdown
 * ("2 unread · 1 pending · 4 complete"), and the latest submissions.
 */

import { api } from './api.js';
import {
  FORM_TYPES,
  TYPE_LABELS,
  escapeHtml,
  fmtDate,
  statusPill,
} from './ui.js';

export async function renderOverview(outlet) {
  const [metrics, recent] = await Promise.all([
    api.get('/api/admin/metrics'),
    api.get('/api/admin/submissions?limit=6'),
  ]);

  const byType = Object.fromEntries(
    FORM_TYPES.map((t) => [t, { unread: 0, pending: 0, complete: 0 }])
  );
  let totalUnread = 0;
  for (const { form_type, status, count } of metrics.submissions) {
    if (byType[form_type] && status in byType[form_type]) byType[form_type][status] = count;
    if (status === 'unread') totalUnread += count;
  }

  const typeCards = FORM_TYPES.map((t) => {
    const c = byType[t];
    const parts = [
      c.unread ? `<span class="dash-pill dash-pill--unread">${c.unread} unread</span>` : '',
      c.pending ? `<span class="dash-pill dash-pill--pending">${c.pending} pending</span>` : '',
      c.complete ? `<span class="dash-pill dash-pill--complete">${c.complete} complete</span>` : '',
    ].filter(Boolean);
    return `
      <a class="neu-card dash-typecard" href="#/submissions?type=${t}">
        <h3>${TYPE_LABELS[t]}</h3>
        <div class="dash-typecard__row">
          ${parts.length ? parts.join('') : '<span class="dash-pill">none yet</span>'}
        </div>
      </a>`;
  }).join('');

  const recentRows = recent.submissions
    .map(
      (s) => `
      <li class="dash-list__item" data-open="${s.id}">
        <div class="dash-list__main">
          <div class="dash-list__title">${escapeHtml(s.name || s.email || '—')}</div>
          <div class="dash-list__sub">${TYPE_LABELS[s.form_type] || s.form_type} · ${escapeHtml(
            s.payload?.message || s.payload?.property || s.email || ''
          )}</div>
        </div>
        <span class="dash-list__meta">${fmtDate(s.created_at)}</span>
        ${statusPill(s.status)}
      </li>`
    )
    .join('');

  const today = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date());

  outlet.innerHTML = `
    <div class="dash-view">
      <div class="dash-view__head">
        <div>
          <h1>Overview</h1>
          <p>${today}</p>
        </div>
        <a class="neu-btn" href="#/properties">Manage properties</a>
      </div>

      <div class="dash-metrics">
        <div class="neu-card dash-metric">
          <b class="${totalUnread ? 'is-gold' : ''}">${totalUnread}</b>
          <span>Unread submissions</span>
        </div>
        <div class="neu-card dash-metric">
          <b>${metrics.properties.active}</b>
          <span>Active listings</span>
        </div>
        <div class="neu-card dash-metric">
          <b>${metrics.properties.featured}</b>
          <span>Featured</span>
        </div>
        <div class="neu-card dash-metric">
          <b>${metrics.properties.total}</b>
          <span>Total properties</span>
        </div>
      </div>

      <h2 class="dash-section-title">Submissions by form</h2>
      <div class="dash-typegrid">${typeCards}</div>

      <h2 class="dash-section-title">Latest submissions</h2>
      <div class="neu-card dash-panel">
        ${
          recentRows
            ? `<ul class="dash-list">${recentRows}</ul>`
            : '<div class="dash-empty">Nothing yet — submissions from the site will land here.</div>'
        }
      </div>
    </div>`;

  outlet.querySelectorAll('[data-open]').forEach((row) => {
    row.addEventListener('click', () => {
      location.hash = `#/submissions?open=${row.dataset.open}`;
    });
  });
}
