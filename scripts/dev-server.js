/**
 * Local dev server — mimics Vercel's routing so the api/ handlers run
 * unmodified: static files from the repo root, /api/* mapped to handler
 * files under api/ (including [param] segments and index.js directories).
 *
 * Run via `npm run dev` (loads .env.local). Dev-only — production is
 * Vercel; this file is never deployed (.vercelignore's scripts/).
 *
 * Handlers are re-imported when their mtime changes, so API edits apply
 * without restarting. (Edits to api/_lib/* still need a restart — module
 * graphs are cached per entry.)
 */

import http from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const API_ROOT = join(ROOT, 'api');
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

const SEGMENT_RE = /^[\w.\-]+$/;

/** /api/admin/properties/3 → { file: api/admin/properties/[id].js, params: { id: '3' } } */
function resolveApiHandler(pathname) {
  const segs = pathname.slice('/api/'.length).split('/').filter(Boolean);
  if (!segs.length || !segs.every((s) => SEGMENT_RE.test(s))) return null;

  let dir = API_ROOT;
  const params = {};
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const isLast = i === segs.length - 1;
    if (seg.startsWith('_')) return null; // _lib is not routable

    if (isLast) {
      const asFile = join(dir, `${seg}.js`);
      if (existsSync(asFile)) return { file: asFile, params };
      const asIndex = join(dir, seg, 'index.js');
      if (existsSync(asIndex)) return { file: asIndex, params };
      const dyn = findDynamic(dir, true);
      if (dyn) return { file: dyn.path, params: { ...params, [dyn.name]: seg } };
      return null;
    }

    const asDir = join(dir, seg);
    if (existsSync(asDir) && statSync(asDir).isDirectory()) {
      dir = asDir;
      continue;
    }
    const dyn = findDynamic(dir, false);
    if (!dyn) return null;
    params[dyn.name] = seg;
    dir = dyn.path;
  }
  return null;
}

function findDynamic(dir, wantFile) {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const m = entry.name.match(wantFile ? /^\[(\w+)\]\.js$/ : /^\[(\w+)\]$/);
    if (m && (wantFile ? entry.isFile() : entry.isDirectory())) {
      return { name: m[1], path: join(dir, entry.name) };
    }
  }
  return null;
}

async function handleApi(req, res, url) {
  const match = resolveApiHandler(url.pathname);
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }
  try {
    const version = statSync(match.file).mtimeMs;
    const mod = await import(`${pathToFileURL(match.file).href}?v=${version}`);
    req.query = { ...Object.fromEntries(url.searchParams), ...match.params };
    await mod.default(req, res);
    if (!res.writableEnded) res.end();
  } catch (err) {
    console.error(`[api] ${req.method} ${url.pathname}:`, err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    if (!res.writableEnded) res.end(JSON.stringify({ error: 'Internal error' }));
  }
}

function handleStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return notFound(res);
  }
  if (pathname === '/') pathname = '/index.html';

  const filePath = normalize(join(ROOT, pathname));
  const inRoot = filePath.startsWith(ROOT + sep);
  const blocked = /[\\/](\.|node_modules[\\/])/.test(filePath.slice(ROOT.length));
  if (!inRoot || blocked || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return notFound(res);
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

function notFound(res) {
  const page = join(ROOT, '404.html');
  if (existsSync(page)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    createReadStream(page).pipe(res);
  } else {
    res.writeHead(404).end('Not found');
  }
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
    handleStatic(req, res, url);
  })
  .listen(PORT, () => {
    console.log(`PRG dev server: http://localhost:${PORT}`);
    console.log(`  DATABASE_URL ${process.env.DATABASE_URL ? 'set' : 'NOT SET (API will 500, site falls back to listings.json)'}`);
    console.log(`  RESEND_API_KEY ${process.env.RESEND_API_KEY ? 'set' : 'NOT SET (emails skipped)'}`);
  });
