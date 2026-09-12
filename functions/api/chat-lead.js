/**
 * Cloudflare Pages Function: POST /api/chat-lead
 * Emails Matt when a chat-widget lead is captured or a chat session ends,
 * using the same Web3Forms integration already used by /api/book.
 * Never logs or returns the access key.
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function clean(v, max = 300) {
  return String(v || '').trim().slice(0, max);
}

function formatTranscript(messages) {
  if (!Array.isArray(messages) || !messages.length) return '(no messages)';
  return messages
    .slice(-30)
    .map((m) => {
      const who = m.role === 'assistant' ? 'UMRT Assistant' : 'Visitor';
      return `${who}: ${clean(m.content, 1200)}`;
    })
    .join('\n\n');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = (env.PUBLIC_WEB3FORMS_KEY || env.WEB3FORMS_ACCESS_KEY || '').trim();
  if (!key || key === 'PUBLIC_WEB3FORMS_KEY' || key.includes('REPLACE')) {
    // Soft-fail — never blocks the chat widget itself.
    return json({ success: false, error: 'not_configured' }, 200);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  const lead = body.lead || {};
  const name = clean(lead.name, 120);
  const phone = clean(lead.phone, 40);
  const email = clean(lead.email, 160);
  const location = clean(lead.location || lead.city_zip, 160);
  const rig = clean(lead.rig, 200);
  const prefer = clean(lead.prefer, 40);
  const issue = clean(lead.issue, 800);

  // A lead needs at least a name and one way to reach them.
  if (!name || (!phone && !email)) {
    return json({ success: false, error: 'missing_lead_fields' }, 400);
  }

  const trigger = clean(body.trigger, 40) || 'captured'; // 'captured' | 'transcript'
  const transcript = trigger === 'transcript' ? formatTranscript(body.messages) : null;

  const out = new FormData();
  out.append('access_key', key);
  out.append(
    'subject',
    trigger === 'transcript'
      ? `UMRT Chat — full conversation: ${name}`
      : `UMRT Chat — new lead: ${name}`
  );
  out.append('name', name);
  out.append('phone', phone);
  out.append('email', email);
  out.append('location', location);
  out.append('rig', rig);
  out.append('prefer_contact', prefer);
  out.append('issue', issue);
  out.append('source', 'Site chat widget');
  if (transcript) out.append('transcript', transcript);
  out.append(
    'message',
    trigger === 'transcript'
      ? `Chat ended. Full transcript below.\n\n${transcript}`
      : `New chat lead captured. Issue: ${issue || '(not yet described)'}\nPrefer contact: ${prefer || 'unspecified'}.`
  );

  try {
    const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: out });
    const data = await res.json().catch(() => ({}));
    return json({ success: !!(data && data.success) });
  } catch {
    return json({ success: false, error: 'network' }, 200);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
