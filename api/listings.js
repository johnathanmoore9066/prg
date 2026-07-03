/**
 * Public listings feed — same `{ listings: [...] }` shape as listings.json,
 * so js/data.js can consume either interchangeably. Returns all rows —
 * the client filters is_active_listing for grids (parity with the JSON
 * file) while direct links to delisted detail pages keep resolving.
 * no-store: dashboard edits must show up immediately.
 */

import { sql, serializeProperty } from './_lib/db.js';
import { json, methodGuard } from './_lib/http.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  try {
    const rows = await sql`
      SELECT * FROM properties
      ORDER BY featured DESC, created_at DESC`;
    res.setHeader('Cache-Control', 'no-store');
    json(res, 200, { listings: rows.map(serializeProperty) });
  } catch (err) {
    console.error('[listings]', err.message);
    json(res, 500, { error: 'Could not load listings' });
  }
}
