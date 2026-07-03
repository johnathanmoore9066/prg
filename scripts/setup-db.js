/**
 * Database setup — idempotent. Run via `npm run db:setup` (reads .env.local).
 *
 *  1. Creates users / properties / submissions tables if missing.
 *  2. Seeds properties from listings.json (existing MLS numbers untouched).
 *  3. Creates the first dashboard user from SEED_ADMIN_* env vars
 *     (existing users are never overwritten — re-run with new values
 *     to add teammates).
 *
 * Safe to run any number of times, against any Neon branch.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const { DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = process.env;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         text NOT NULL UNIQUE,
    name          text NOT NULL DEFAULT '',
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS properties (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mls_number        bigint NOT NULL UNIQUE,
    street_address    text NOT NULL,
    city              text NOT NULL,
    state             text NOT NULL DEFAULT 'NC',
    zipcode           text NOT NULL,
    monthly_price     integer NOT NULL CHECK (monthly_price >= 0),
    status            text NOT NULL DEFAULT 'For Rent',
    contact_email     text NOT NULL DEFAULT '',
    description       text NOT NULL DEFAULT '',
    is_active_listing boolean NOT NULL DEFAULT true,
    featured          boolean NOT NULL DEFAULT false,
    image             text DEFAULT '',
    hero_image        text DEFAULT '',
    tagline           text DEFAULT '',
    beds              integer,
    baths             numeric(3,1),
    sqft              integer,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    form_type  text NOT NULL CHECK (form_type IN
                 ('contact','owner','showing','applications','maintenance','payments')),
    name       text,
    email      text,
    phone      text,
    payload    jsonb NOT NULL,
    page       text,
    status     text NOT NULL DEFAULT 'unread'
                 CHECK (status IN ('unread','pending','complete','archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS submissions_type_status_idx ON submissions (form_type, status)`,
  `CREATE INDEX IF NOT EXISTS submissions_created_idx ON submissions (created_at DESC)`,
];

async function main() {
  for (const stmt of DDL) await sql.query(stmt);
  console.log('Tables ready: users, properties, submissions');

  const listingsPath = fileURLToPath(new URL('../listings.json', import.meta.url));
  const { listings } = JSON.parse(readFileSync(listingsPath, 'utf8'));

  let seeded = 0;
  for (const l of listings) {
    const rows = await sql`
      INSERT INTO properties (
        mls_number, street_address, city, state, zipcode, monthly_price,
        status, contact_email, description, is_active_listing, featured,
        image, hero_image, tagline, beds, baths, sqft
      ) VALUES (
        ${l.mls_number}, ${l.street_address}, ${l.city}, ${l.state}, ${l.zipcode},
        ${l.monthly_price}, ${l.status}, ${l.contact_email}, ${l.description},
        ${l.is_active_listing}, ${l.featured}, ${l.image}, ${l.hero_image},
        ${l.tagline}, ${l.beds}, ${l.baths}, ${l.sqft}
      )
      ON CONFLICT (mls_number) DO NOTHING
      RETURNING id`;
    seeded += rows.length;
  }
  const [{ count: propTotal }] = await sql`SELECT count(*)::int AS count FROM properties`;
  console.log(`Properties: ${seeded} seeded from listings.json (${propTotal} total)`);

  if (SEED_ADMIN_EMAIL && SEED_ADMIN_PASSWORD) {
    const hash = bcrypt.hashSync(SEED_ADMIN_PASSWORD, 10);
    const rows = await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${SEED_ADMIN_EMAIL.toLowerCase()}, ${SEED_ADMIN_NAME || ''}, ${hash})
      ON CONFLICT (email) DO NOTHING
      RETURNING id`;
    console.log(
      rows.length
        ? `User created: ${SEED_ADMIN_EMAIL}`
        : `User already exists (unchanged): ${SEED_ADMIN_EMAIL}`
    );
  } else {
    console.log('SEED_ADMIN_EMAIL/PASSWORD not set — skipped user creation');
  }

  const [{ count: userTotal }] = await sql`SELECT count(*)::int AS count FROM users`;
  console.log(`Users: ${userTotal} total. Done.`);
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
