/**
 * Data layer — single cached fetch of the listings API + helpers.
 * All rendering reads through these functions so the data source is
 * swappable in this file only. The API is tried first (live dashboard
 * edits); the static listings.json is the fallback, which also keeps
 * plain static hosting fully working.
 */

import { CONFIG } from './config.js';

let _listingsPromise = null;

async function fetchListings(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.listings) ? data.listings : [];
}

export function getListings() {
  if (!_listingsPromise) {
    const sources = [CONFIG.LISTINGS_ENDPOINT, 'listings.json'].filter(Boolean);
    _listingsPromise = (async () => {
      for (const url of sources) {
        try {
          return await fetchListings(url);
        } catch (err) {
          console.warn(`[PRG] Could not load ${url}:`, err.message);
        }
      }
      return [];
    })();
  }
  return _listingsPromise;
}

export async function activeListings() {
  const all = await getListings();
  return all.filter((l) => l.is_active_listing);
}

export async function featuredListing() {
  const active = await activeListings();
  return active.find((l) => l.featured) || active[0] || null;
}

export async function findByMls(mls) {
  const all = await getListings();
  return all.find((l) => String(l.mls_number) === String(mls)) || null;
}

export async function moreLikeThis(mls, limit = 6) {
  const active = await activeListings();
  return active.filter((l) => String(l.mls_number) !== String(mls)).slice(0, limit);
}

/* ---- Formatting helpers ---- */

export function formatPrice(n) {
  if (typeof n !== 'number') return '';
  return `$${n.toLocaleString('en-US')}/mo`;
}

export function cityState(l) {
  return `${l.city}, ${l.state}`;
}

export function posterSrc(l) {
  return l.hero_image || (l.image ? `public/${l.image}` : null);
}

export function detailUrl(l) {
  return `property.html?mls=${encodeURIComponent(l.mls_number)}`;
}
