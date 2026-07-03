/**
 * Site-wide configuration — single source of truth for contact details
 * and lead-capture wiring.
 *
 * NOTE: CONTACT_EMAIL currently points at the PRG Triangle (buy/sell) address.
 * When a property-management-specific inbox exists, change it here only.
 */
export const CONFIG = {
  SITE_NAME: 'Pace Realty Group Property Management',
  SITE_SHORT: 'PRG Property Management',
  TAGLINE: "Raleigh's Residential Property Management Experts",
  SERVICE_AREA: 'Wake County | Raleigh, Cary, Apex',

  CONTACT_EMAIL: 'lpace@prgtriangle.com',
  PHONE: '919-789-0522',
  FAX: '919-400-4238',
  ADDRESS_LINES: ['P.O. Box 6607', 'Raleigh, NC 27628-6607'],

  // Backend endpoints (Vercel functions under /api). The destination email
  // is never exposed as a send target in client markup.
  LEADS_ENDPOINT: '/api/leads',

  // Listings are served from the database; js/data.js falls back to the
  // static listings.json when this endpoint is unreachable (e.g. under
  // `python -m http.server`).
  LISTINGS_ENDPOINT: '/api/listings',

  // Demo mode: forms validate + simulate success instead of submitting.
  DEMO_MODE: false,
};
