/**
 * Submission detail + status transitions.
 * GET ?open=1 auto-advances unread → pending: "opened it" is what makes
 * the unread count honest without staff managing statuses by hand.
 */

import { sql } from '../../_lib/db.js';
import { json, methodGuard, readBody, readId } from '../../_lib/http.js';
import { requireUser, checkOrigin } from '../../_lib/auth.js';

const STATUSES = ['unread', 'pending', 'complete', 'archived'];

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET', 'PATCH')) return;
  if (!(await requireUser(req))) return json(res, 401, { error: 'Not signed in' });

  const id = readId(req);
  if (!id) return json(res, 400, { error: 'Invalid submission id' });

  try {
    if (req.method === 'GET') {
      if (req.query?.open) {
        await sql`
          UPDATE submissions SET status = 'pending', updated_at = now()
          WHERE id = ${id} AND status = 'unread'`;
      }
      const rows = await sql`SELECT * FROM submissions WHERE id = ${id}`;
      if (!rows.length) return json(res, 404, { error: 'Submission not found' });
      return json(res, 200, { submission: rows[0] });
    }

    // PATCH — manual status change
    if (!checkOrigin(req)) return json(res, 403, { error: 'Bad origin' });
    const body = await readBody(req);
    if (!STATUSES.includes(body?.status)) {
      return json(res, 400, { error: 'Invalid status' });
    }
    const rows = await sql`
      UPDATE submissions SET status = ${body.status}, updated_at = now()
      WHERE id = ${id} RETURNING *`;
    if (!rows.length) return json(res, 404, { error: 'Submission not found' });
    json(res, 200, { submission: rows[0] });
  } catch (err) {
    console.error('[admin/submissions/id]', err.message);
    json(res, 500, { error: 'Request failed' });
  }
}
