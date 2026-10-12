// One shared document per family, stored in Upstash Redis.
// Connect "Upstash for Redis" to the project from the Vercel Marketplace; it adds the env vars below.
// Without them this route answers 501 and the app keeps data on each device.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ID = /^[a-z0-9]{8,24}$/;
const MAX_BYTES = 512 * 1024;

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);
  return (await res.json()).result;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(501).json({ error: 'database_not_configured' });

  const id = String((req.query && req.query.id) || '');
  if (!ID.test(id)) return res.status(400).json({ error: 'bad_id' });
  const key = `kudi:home:${id}`;

  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', key]);
      return res.status(200).json({ data: raw ? JSON.parse(raw) : null });
    }
    if (req.method === 'PUT') {
      let body;
      try { body = readBody(req); } catch { return res.status(400).json({ error: 'bad_json' }); }
      const data = body.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'bad_body' });
      const json = JSON.stringify(data);
      if (Buffer.byteLength(json) > MAX_BYTES) return res.status(413).json({ error: 'too_large' });
      await redis(['SET', key, json]);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      await redis(['DEL', key]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'storage_unavailable' });
  }
}
