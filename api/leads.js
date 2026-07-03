/**
 * Public lead intake for all six site forms.
 *
 * Pipeline: spam re-checks (server-side authority for the client's honeypot
 * and time-trap — bots get a silent 200 and learn nothing) → validation →
 * insert as 'unread' → best-effort email notification. The DB row is
 * committed before the email is attempted; a Resend failure never fails
 * the lead.
 */

import { sql } from './_lib/db.js';
import { json, methodGuard, readBody } from './_lib/http.js';
import { sendNotification } from './_lib/notify.js';

const FORM_TYPES = ['contact', 'owner', 'showing', 'applications', 'maintenance', 'payments'];
const MIN_HUMAN_MS = 1500;
const MAX_FIELD_LEN = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const body = await readBody(req);
  if (!body) return json(res, 400, { error: 'Invalid request body' });

  // Spam controls — pretend success so bots can't learn the rules
  const elapsed = Date.now() - Number(body._ts || 0);
  if (body.website || !Number.isFinite(elapsed) || elapsed < MIN_HUMAN_MS) {
    return json(res, 200, { ok: true });
  }

  const formType = body.form_type;
  if (!FORM_TYPES.includes(formType)) {
    return json(res, 400, { error: 'Unknown form type' });
  }
  if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
    return json(res, 400, { error: 'A valid email is required' });
  }

  // Payload = submitted fields minus transport/spam plumbing
  const payload = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'website' || key === '_ts' || key === 'form_type') continue;
    if (typeof value !== 'string') continue;
    payload[key] = value.slice(0, MAX_FIELD_LEN);
  }

  try {
    await sql`
      INSERT INTO submissions (form_type, name, email, phone, payload, page)
      VALUES (${formType}, ${payload.name || null}, ${payload.email},
              ${payload.phone || null}, ${JSON.stringify(payload)},
              ${payload._page || null})`;
  } catch (err) {
    console.error('[leads]', err.message);
    return json(res, 500, { error: 'Could not save your submission' });
  }

  await sendNotification(formType, payload);
  json(res, 200, { ok: true });
}
