/**
 * Properties view — table of all listings (including inactive), inline
 * Active/Featured toggles, add/edit modal form, delete with confirm.
 * Public pages read the same table via /api/listings, so changes here
 * are live on the site immediately.
 */

import { api } from './api.js';
import {
  escapeHtml,
  fmtPrice,
  toast,
  openModal,
  closeModal,
  confirmDialog,
} from './ui.js';

const STATUS_OPTIONS = ['For Rent', 'Pending', 'Rented', 'Coming Soon'];

export async function renderProperties(outlet) {
  const { properties } = await api.get('/api/admin/properties');
  const refresh = () => renderProperties(outlet);

  const rows = properties
    .map((p) => {
      const facts = [
        p.beds != null ? `${p.beds} bd` : '',
        p.baths != null ? `${p.baths} ba` : '',
        p.sqft != null ? `${p.sqft.toLocaleString('en-US')} sqft` : '',
      ]
        .filter(Boolean)
        .join(' / ');
      return `
      <li class="dash-list__item dash-list__item--flat" data-id="${p.id}">
        <div class="dash-list__main">
          <div class="dash-list__title">${escapeHtml(p.street_address)}</div>
          <div class="dash-list__sub">${escapeHtml(p.city)}, ${escapeHtml(p.state)} ${escapeHtml(
            p.zipcode
          )} · MLS #${p.mls_number}${facts ? ' · ' + facts : ''}</div>
        </div>
        <span class="dash-prop__price">${fmtPrice(p.monthly_price)}</span>
        <div class="dash-list__actions">
          <span class="dash-prop__flag">Active
            <button class="neu-toggle" type="button" data-key="is_active_listing"
              aria-pressed="${p.is_active_listing}" aria-label="Toggle active"></button>
          </span>
          <span class="dash-prop__flag">Featured
            <button class="neu-toggle" type="button" data-key="featured"
              aria-pressed="${p.featured}" aria-label="Toggle featured"></button>
          </span>
          <button class="neu-btn neu-btn--small" type="button" data-edit>Edit</button>
          <button class="neu-btn neu-btn--small neu-btn--danger" type="button" data-del>Delete</button>
        </div>
      </li>`;
    })
    .join('');

  outlet.innerHTML = `
    <div class="dash-view">
      <div class="dash-view__head">
        <div>
          <h1>Properties</h1>
          <p>${properties.length} total · changes go live on the site immediately</p>
        </div>
        <button class="neu-btn neu-btn--gold" type="button" data-add>+ Add property</button>
      </div>
      <div class="neu-card dash-panel">
        ${
          rows
            ? `<ul class="dash-list">${rows}</ul>`
            : '<div class="dash-empty">No properties yet — add the first one.</div>'
        }
      </div>
    </div>`;

  outlet.querySelector('[data-add]').addEventListener('click', () => openForm(null, refresh));

  outlet.querySelectorAll('.dash-list__item').forEach((row) => {
    const id = Number(row.dataset.id);
    const prop = properties.find((p) => p.id === id);

    row.querySelectorAll('.neu-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const next = btn.getAttribute('aria-pressed') !== 'true';
        btn.disabled = true;
        try {
          await api.patch(`/api/admin/properties/${id}`, { [btn.dataset.key]: next });
          btn.setAttribute('aria-pressed', String(next));
          prop[btn.dataset.key] = next;
        } catch (err) {
          toast(err.message, true);
        } finally {
          btn.disabled = false;
        }
      });
    });

    row.querySelector('[data-edit]').addEventListener('click', () => openForm(prop, refresh));

    row.querySelector('[data-del]').addEventListener('click', async () => {
      const ok = await confirmDialog(
        `Delete ${prop.street_address}? Submissions are kept, but the listing is gone for good.`
      );
      if (!ok) return;
      try {
        await api.del(`/api/admin/properties/${id}`);
        toast('Property deleted');
        refresh();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
}

/* ---- Add / edit form ---- */

function field(label, name, value, { type = 'text', required = false, placeholder = '' } = {}) {
  return `
    <div class="dash-field">
      <label for="pf-${name}">${label}${required ? ' *' : ''}</label>
      <input class="neu-input" id="pf-${name}" name="${name}" type="${type}"
        value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(placeholder)}"
        ${required ? 'required' : ''}>
    </div>`;
}

function openForm(prop, refresh) {
  const isNew = !prop;
  const p = prop || {};
  const statusOptions = [...new Set([...(p.status ? [p.status] : []), ...STATUS_OPTIONS])]
    .map((s) => `<option ${s === p.status ? 'selected' : ''}>${escapeHtml(s)}</option>`)
    .join('');

  const card = openModal(`
    <h2 class="dash-modal__title">${isNew ? 'Add property' : `Edit ${escapeHtml(p.street_address)}`}</h2>
    <form class="dash-form" novalidate>
      ${field('Street address', 'street_address', p.street_address, { required: true })}
      <div class="dash-form__row">
        ${field('City', 'city', p.city, { required: true })}
        ${field('State', 'state', p.state ?? 'NC')}
      </div>
      <div class="dash-form__row">
        ${field('ZIP code', 'zipcode', p.zipcode, { required: true })}
        ${field('MLS number', 'mls_number', p.mls_number, { type: 'number', required: true })}
      </div>
      <div class="dash-form__row">
        ${field('Monthly rent ($)', 'monthly_price', p.monthly_price, { type: 'number', required: true })}
        <div class="dash-field">
          <label for="pf-status">Status</label>
          <select class="neu-input" id="pf-status" name="status">${statusOptions}</select>
        </div>
      </div>
      <div class="dash-form__row">
        ${field('Bedrooms', 'beds', p.beds, { type: 'number' })}
        ${field('Bathrooms', 'baths', p.baths, { type: 'number' })}
      </div>
      <div class="dash-form__row">
        ${field('Approx. sq ft', 'sqft', p.sqft, { type: 'number' })}
        ${field('Contact email', 'contact_email', p.contact_email, { type: 'email' })}
      </div>
      ${field('Tagline', 'tagline', p.tagline, { placeholder: 'One line for the listing card' })}
      <div class="dash-field">
        <label for="pf-description">Description</label>
        <textarea class="neu-input" id="pf-description" name="description">${escapeHtml(
          p.description ?? ''
        )}</textarea>
      </div>
      <div class="dash-form__row">
        ${field('Card image (URL or path)', 'image', p.image, { placeholder: '705.jpg' })}
        ${field('Hero image (URL or path)', 'hero_image', p.hero_image, {
          placeholder: 'public/placeholders/705-hero.jpg',
        })}
      </div>
      <div class="dash-form__toggles">
        <label>Active listing
          <button class="neu-toggle" type="button" data-flag="is_active_listing"
            aria-pressed="${p.is_active_listing ?? true}"></button>
        </label>
        <label>Featured on home page
          <button class="neu-toggle" type="button" data-flag="featured"
            aria-pressed="${p.featured ?? false}"></button>
        </label>
      </div>
      <p class="dash-form__error" data-form-error hidden></p>
      <div class="dash-form__foot">
        <button class="neu-btn" type="button" data-cancel>Cancel</button>
        <button class="neu-btn neu-btn--gold" type="submit">${isNew ? 'Add property' : 'Save changes'}</button>
      </div>
    </form>`);

  const form = card.querySelector('form');
  card.querySelector('[data-cancel]').addEventListener('click', closeModal);
  card.querySelectorAll('[data-flag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = card.querySelector('[data-form-error]');
    errEl.hidden = true;

    const body = Object.fromEntries(new FormData(form).entries());
    card.querySelectorAll('[data-flag]').forEach((btn) => {
      body[btn.dataset.flag] = btn.getAttribute('aria-pressed') === 'true';
    });

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    try {
      if (isNew) await api.post('/api/admin/properties', body);
      else await api.patch(`/api/admin/properties/${p.id}`, body);
      closeModal();
      toast(isNew ? 'Property added' : 'Property saved');
      refresh();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
