/**
 * Staff sessions — HS256 JWT in an httpOnly cookie. Stateless: no sessions
 * table, revocation happens by changing SESSION_SECRET (fine at this team
 * size). Users are created only by scripts/setup-db.js — no registration
 * endpoint exists.
 */

import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'prg_session';
const MAX_AGE_S = 7 * 24 * 60 * 60;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function signSession(user) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secretKey());
}

/** Session payload ({ sub, email, name }) or null. Never throws. */
export async function requireUser(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', cookieString(token, MAX_AGE_S));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookieString('', 0));
}

function cookieString(value, maxAge) {
  // `Secure` only when deployed — it would silently drop the cookie on
  // plain-http localhost.
  const secure = process.env.VERCEL_ENV ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function parseCookies(req) {
  const out = {};
  for (const pair of (req.headers.cookie || '').split(';')) {
    const eq = pair.indexOf('=');
    if (eq > 0) out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

/**
 * CSRF backstop for mutating admin routes: browsers always send Origin on
 * cross-site POST/PATCH/DELETE, so when present it must match the Host.
 * (Header-less non-browser clients still need the session cookie.)
 */
export function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
