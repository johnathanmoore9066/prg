/**
 * Dashboard overview rollup. Archived submissions are excluded from every
 * count — archiving is how staff make spam disappear from the numbers.
 */

import { sql } from '../_lib/db.js';
import { json, methodGuard } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  if (!(await requireUser(req))) return json(res, 401, { error: 'Not signed in' });

  try {
    const [properties] = await sql`
      SELECT count(*)::int                                   AS total,
             count(*) FILTER (WHERE is_active_listing)::int  AS active,
             count(*) FILTER (WHERE featured)::int           AS featured
      FROM properties`;

    const submissions = await sql`
      SELECT form_type, status, count(*)::int AS count
      FROM submissions
      WHERE status <> 'archived'
      GROUP BY form_type, status`;

    json(res, 200, { properties, submissions });
  } catch (err) {
    console.error('[metrics]', err.message);
    json(res, 500, { error: 'Could not load metrics' });
  }
}
