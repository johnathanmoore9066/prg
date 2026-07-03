/**
 * Data layer — single cached fetch of listings.json + helpers.
 * All rendering reads through these functions so swapping the data
 * source later (an API, a CMS) touches this file only.
 */

let _listingsPromise = null;

export function getListings() {
  if (!_listingsPromise) {
    _listingsPromise = fetch('listings.json', { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`listings.json ${res.status}`);
        return res.json();
      })
      .then((data) => (Array.isArray(data.listings) ? data.listings : []))
      .catch((err) => {
        console.warn('[PRG] Could not load listings:', err.message);
        return [];
      });
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
