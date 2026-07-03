import { json, methodGuard } from '../_lib/http.js';
import { clearSessionCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  clearSessionCookie(res);
  json(res, 200, { ok: true });
}
