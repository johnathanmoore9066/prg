/**
 * Form-submission email notifications via Resend (plain fetch, no SDK).
 *
 * DESTINATIONS is the single switch-over point: when Lisa's aliases exist
 * (applications.lpace@prgtriangle.com etc.), change the values here and
 * nothing else. Until the prgtriangle.com domain is verified in Resend,
 * RESEND_FROM stays on onboarding@resend.dev, which only delivers to the
 * Resend account owner's own address.
 *
 * Notifications are best-effort by design: the submission is already in the
 * database before this runs, and any failure here is logged, never thrown —
 * the dashboard is the source of truth.
 */

const DESTINATIONS = {
  contact: process.env.NOTIFY_EMAIL_DEFAULT,
  owner: process.env.NOTIFY_EMAIL_DEFAULT,
  showing: process.env.NOTIFY_EMAIL_DEFAULT,
  applications: process.env.NOTIFY_EMAIL_DEFAULT,
  maintenance: process.env.NOTIFY_EMAIL_DEFAULT,
  payments: process.env.NOTIFY_EMAIL_DEFAULT,
};

const SUBJECTS = {
  contact: (p) => `New contact message from ${p.name || p.email}`,
  owner: (p) => `Owner inquiry — ${p.property_address || p.name || p.email}`,
  showing: (p) => `Showing request — ${p.property || p.name || p.email}`,
  applications: (p) => `Waitlist signup (applications) — ${p.email}`,
  maintenance: (p) => `Waitlist signup (maintenance) — ${p.email}`,
  payments: (p) => `Waitlist signup (payments) — ${p.email}`,
};

const FIELD_LABELS = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  role: 'I am a',
  message: 'Message',
  property_address: 'Property address',
  property: 'Property',
  move_in: 'Desired move-in',
  interest: 'Interest',
  _page: 'Submitted from',
};

export async function sendNotification(formType, payload) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = DESTINATIONS[formType];
  if (!apiKey || !to) {
    console.warn(`[notify] Skipped (${!apiKey ? 'RESEND_API_KEY' : 'destination'} not set)`);
    return;
  }

  const fields = Object.entries(payload).filter(([, v]) => v !== '' && v != null);
  const label = (k) => FIELD_LABELS[k] || k;
  const text = fields.map(([k, v]) => `${label(k)}: ${v}`).join('\n');
  const html = `<div style="font-family:sans-serif;line-height:1.6">
    <h2 style="margin:0 0 12px">${escapeHtml(SUBJECTS[formType](payload))}</h2>
    <table cellpadding="0" cellspacing="0">${fields
      .map(
        ([k, v]) =>
          `<tr><td style="padding:2px 16px 2px 0;color:#888;vertical-align:top">${escapeHtml(label(k))}</td>` +
          `<td style="padding:2px 0;white-space:pre-wrap">${escapeHtml(String(v))}</td></tr>`
      )
      .join('')}</table>
  </div>`;

  const body = {
    from: process.env.RESEND_FROM || 'PRG Property Management <onboarding@resend.dev>',
    to: [to],
    subject: SUBJECTS[formType](payload),
    text,
    html,
  };
  if (payload.email) body.reply_to = [payload.email];

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[notify] Resend ${res.status}:`, await res.text());
    }
  } catch (err) {
    console.error('[notify] Resend request failed:', err.message);
  }
}

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
