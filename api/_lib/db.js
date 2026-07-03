/**
 * Neon connection + property row serialization.
 * Files under api/_lib are shared modules — Vercel does not deploy them
 * as functions (leading underscore).
 */

import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);

/**
 * DB row → the listing shape the front end already consumes
 * (listings.json parity: numeric fields as numbers, not pg strings).
 */
export function serializeProperty(row) {
  return {
    id: Number(row.id),
    mls_number: Number(row.mls_number),
    street_address: row.street_address,
    city: row.city,
    state: row.state,
    zipcode: row.zipcode,
    monthly_price: row.monthly_price,
    status: row.status,
    contact_email: row.contact_email,
    description: row.description,
    is_active_listing: row.is_active_listing,
    featured: row.featured,
    image: row.image,
    hero_image: row.hero_image,
    tagline: row.tagline,
    beds: row.beds,
    baths: row.baths === null ? null : Number(row.baths),
    sqft: row.sqft,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
