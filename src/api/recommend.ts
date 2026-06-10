// Vercel serverless function to forward requests to Anthropic (Claude) Messages API
// Implements a simple in-memory rate limiter (best-effort in serverless env).

const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const buckets = new Map();

function getIpKey(req: any) {
  const xf = req.headers?.['x-forwarded-for'];
  if (xf && typeof xf === 'string') return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function allowRequest(ip: string) {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_CAPACITY, lastRefill: now };
    buckets.set(ip, bucket);
  }
  const elapsed = now - bucket.lastRefill;
  const refillCount = Math.floor(elapsed / RATE_LIMIT_WINDOW_MS);
  if (refillCount > 0) {
    bucket.tokens = Math.min(RATE_LIMIT_CAPACITY, bucket.tokens + refillCount * RATE_LIMIT_CAPACITY);
    bucket.lastRefill = now;
  }
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIpKey(req);
  if (!allowRequest(ip)) return res.status(429).json({ error: 'Rate limit exceeded: max 10 requests per minute' });

  const body = req.body || {};
  const { gross_salary, state, take_home, expenses, framework, market_percentile, question } = body;

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing CLAUDE_API_KEY env var' });

  const prompt = `You are a helpful personal finance assistant. User context (json):\n${JSON.stringify({ gross_salary, state, take_home, expenses, framework, market_percentile }, null, 2)}\n\nAnswer the user's question below in an actionable and concise way. Use bullet points when helpful.\n\nQuestion:\n${String(question || '').trim()}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'You are a helpful personal finance assistant. Keep answers concise and actionable.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Anthropic API error', resp.status, txt);
      return res.status(502).json({ error: 'Upstream AI API error', details: txt });
    }

    const data = await resp.json();
    // Response content path per spec: data.content[0].text
    const content = Array.isArray(data?.content) ? data.content[0]?.text : data?.content?.[0]?.text;
    const answer = content ?? data?.output ?? '';

    return res.status(200).json({ answer });
  } catch (err: any) {
    console.error('Error forwarding to Anthropic:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
