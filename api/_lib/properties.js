/**
 * Property input validation/coercion shared by create (POST) and
 * edit (PATCH). Form values arrive as strings — numbers are coerced,
 * empty optional numerics become null.
 */

const STRING_FIELDS = {
  street_address: { required: true, max: 300 },
  city: { required: true, max: 100 },
  state: { max: 20 },
  zipcode: { required: true, max: 20 },
  status: { max: 60 },
  contact_email: { max: 200 },
  description: { max: 10000 },
  image: { max: 500 },
  hero_image: { max: 500 },
  tagline: { max: 300 },
};

const INT_FIELDS = {
  mls_number: { required: true, min: 1 },
  monthly_price: { required: true, min: 0 },
  beds: { nullable: true, min: 0 },
  sqft: { nullable: true, min: 0 },
};

const BOOL_FIELDS = ['is_active_listing', 'featured'];

/**
 * Returns { fields } (whitelisted, coerced column values) or { error }.
 * With partial=true (PATCH), absent fields are simply skipped.
 */
export function validateProperty(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object') return { error: 'Invalid request body' };
  const fields = {};

  for (const [key, rule] of Object.entries(STRING_FIELDS)) {
    if (!(key in input)) {
      if (!partial && rule.required) return { error: `${key} is required` };
      continue;
    }
    const val = String(input[key] ?? '').trim();
    if (rule.required && !val) return { error: `${key} is required` };
    if (val.length > rule.max) return { error: `${key} is too long` };
    fields[key] = val;
  }

  for (const [key, rule] of Object.entries(INT_FIELDS)) {
    if (!(key in input)) {
      if (!partial && rule.required) return { error: `${key} is required` };
      continue;
    }
    const raw = input[key];
    if ((raw === '' || raw == null) && rule.nullable) {
      fields[key] = null;
      continue;
    }
    const num = Number(raw);
    if (!Number.isInteger(num) || num < rule.min) return { error: `${key} must be a whole number` };
    fields[key] = num;
  }

  if ('baths' in input) {
    const raw = input.baths;
    if (raw === '' || raw == null) {
      fields.baths = null;
    } else {
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0 || num > 99) return { error: 'baths must be a number' };
      fields.baths = num;
    }
  }

  for (const key of BOOL_FIELDS) {
    if (key in input) fields[key] = Boolean(input[key]);
  }

  if (!partial) {
    fields.state ??= 'NC';
    fields.status ??= 'For Rent';
  }
  if (partial && Object.keys(fields).length === 0) return { error: 'Nothing to update' };

  return { fields };
}
