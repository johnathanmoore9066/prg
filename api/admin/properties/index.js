import { sql, serializeProperty } from '../../_lib/db.js';
import { json, methodGuard, readBody } from '../../_lib/http.js';
import { requireUser, checkOrigin } from '../../_lib/auth.js';
import { validateProperty } from '../../_lib/properties.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET', 'POST')) return;
  if (!(await requireUser(req))) return json(res, 401, { error: 'Not signed in' });

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM properties ORDER BY featured DESC, created_at DESC`;
      return json(res, 200, { properties: rows.map(serializeProperty) });
    }

    // POST — create
    if (!checkOrigin(req)) return json(res, 403, { error: 'Bad origin' });
    const { fields, error } = validateProperty(await readBody(req));
    if (error) return json(res, 400, { error });

    const rows = await sql`
      INSERT INTO properties (
        mls_number, street_address, city, state, zipcode, monthly_price,
        status, contact_email, description, is_active_listing, featured,
        image, hero_image, tagline, beds, baths, sqft
      ) VALUES (
        ${fields.mls_number}, ${fields.street_address}, ${fields.city},
        ${fields.state}, ${fields.zipcode}, ${fields.monthly_price},
        ${fields.status}, ${fields.contact_email ?? ''}, ${fields.description ?? ''},
        ${fields.is_active_listing ?? true}, ${fields.featured ?? false},
        ${fields.image ?? ''}, ${fields.hero_image ?? ''}, ${fields.tagline ?? ''},
        ${fields.beds ?? null}, ${fields.baths ?? null}, ${fields.sqft ?? null}
      )
      RETURNING *`;
    json(res, 201, { property: serializeProperty(rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return json(res, 409, { error: 'A property with that MLS number already exists' });
    }
    console.error('[admin/properties]', err.message);
    json(res, 500, { error: 'Request failed' });
  }
}
