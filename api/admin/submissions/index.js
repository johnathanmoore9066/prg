/**
 * Submissions inbox: filterable list + the counts rollup in one response
 * (badges and filter chips never need a second request).
 */

import { sql } from '../../_lib/db.js';
import { json, methodGuard } from '../../_lib/http.js';
import { requireUser } from '../../_lib/auth.js';

const FORM_TYPES = ['contact', 'owner', 'showing', 'applications', 'maintenance', 'payments'];
const STATUSES = ['unread', 'pending', 'complete', 'archived'];

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  if (!(await requireUser(req))) return json(res, 401, { error: 'Not signed in' });

  const q = req.query || {};
  const type = FORM_TYPES.includes(q.type) ? q.type : null;
  const status = STATUSES.includes(q.status) ? q.status : null;
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100);
  const offset = Math.max(Number(q.offset) || 0, 0);

  const where = [];
  const params = [];
  if (type) {
    params.push(type);
    where.push(`form_type = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  } else {
    where.push(`status <> 'archived'`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  try {
    const listSql = `
      SELECT id, form_type, name, email, phone, payload, page, status,
             created_at, updated_at
      FROM submissions ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const [submissions, totals, counts] = await Promise.all([
      sql.query(listSql, [...params, limit, offset]),
      sql.query(`SELECT count(*)::int AS total FROM submissions ${whereSql}`, params),
      sql`SELECT form_type, status, count(*)::int AS count
          FROM submissions WHERE status <> 'archived'
          GROUP BY form_type, status`,
    ]);

    json(res, 200, {
      submissions,
      total: totals[0].total,
      counts,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[admin/submissions]', err.message);
    json(res, 500, { error: 'Could not load submissions' });
  }
}
