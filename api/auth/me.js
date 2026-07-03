import { json, methodGuard } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const user = await requireUser(req);
  if (!user) return json(res, 401, { error: 'Not signed in' });
  json(res, 200, { user: { email: user.email, name: user.name } });
}
