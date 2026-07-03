import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { json, methodGuard, readBody } from '../_lib/http.js';
import { signSession, setSessionCookie, checkOrigin } from '../_lib/auth.js';

// Compared against when the email doesn't match a user, so both failure
// paths cost one bcrypt verify (no user-enumeration via timing).
const DUMMY_HASH = '$2b$10$q8sZw7RPcZ2cN5Ima9kq1O59v10rU76915pi9TUIpiLZpsWaN7XK6';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  if (!checkOrigin(req)) return json(res, 403, { error: 'Bad origin' });

  const body = await readBody(req);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) return json(res, 400, { error: 'Email and password are required' });

  try {
    const rows = await sql`
      SELECT id, email, name, password_hash FROM users WHERE email = ${email}`;
    const user = rows[0];
    const ok = bcrypt.compareSync(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !ok) {
      return json(res, 401, { error: 'Incorrect email or password' });
    }

    setSessionCookie(res, await signSession(user));
    json(res, 200, { user: { email: user.email, name: user.name } });
  } catch (err) {
    console.error('[login]', err.message);
    json(res, 500, { error: 'Login failed — try again' });
  }
}
