/**
 * Request/response helpers that work identically on Vercel's Node runtime
 * and the local dev server (scripts/dev-server.js) — handlers never rely
 * on Vercel-only res.json()/req.body enhancements.
 */

const MAX_BODY_BYTES = 32 * 1024;

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

/** True if the method is allowed; otherwise responds 405 and returns false. */
export function methodGuard(req, res, ...methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  json(res, 405, { error: 'Method not allowed' });
  return false;
}

/** Parsed JSON body — uses Vercel's pre-parsed req.body when present. */
export async function readBody(req) {
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? safeParse(req.body) : req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  return safeParse(Buffer.concat(chunks).toString('utf8'));
}

function safeParse(text) {
  try {
    const val = JSON.parse(text);
    return val && typeof val === 'object' ? val : null;
  } catch {
    return null;
  }
}

/** Positive-integer route param (Vercel puts [id] into req.query). */
export function readId(req) {
  const id = Number(req.query?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}
