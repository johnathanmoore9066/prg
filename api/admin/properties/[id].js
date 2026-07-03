import { sql, serializeProperty } from '../../_lib/db.js';
import { json, methodGuard, readBody, readId } from '../../_lib/http.js';
import { requireUser, checkOrigin } from '../../_lib/auth.js';
import { validateProperty } from '../../_lib/properties.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'PATCH', 'DELETE')) return;
  if (!(await requireUser(req))) return json(res, 401, { error: 'Not signed in' });
  if (!checkOrigin(req)) return json(res, 403, { error: 'Bad origin' });

  const id = readId(req);
  if (!id) return json(res, 400, { error: 'Invalid property id' });

  try {
    if (req.method === 'DELETE') {
      const rows = await sql`DELETE FROM properties WHERE id = ${id} RETURNING id`;
      if (!rows.length) return json(res, 404, { error: 'Property not found' });
      return json(res, 200, { ok: true });
    }

    // PATCH — partial update over the validated whitelist
    const { fields, error } = validateProperty(await readBody(req), { partial: true });
    if (error) return json(res, 400, { error });

    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const params = [...keys.map((k) => fields[k]), id];
    const rows = await sql.query(
      `UPDATE properties SET ${sets}, updated_at = now()
       WHERE id = $${keys.length + 1} RETURNING *`,
      params
    );
    if (!rows.length) return json(res, 404, { error: 'Property not found' });
    json(res, 200, { property: serializeProperty(rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return json(res, 409, { error: 'A property with that MLS number already exists' });
    }
    console.error('[admin/properties/id]', err.message);
    json(res, 500, { error: 'Request failed' });
  }
}
