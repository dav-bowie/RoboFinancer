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

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing CLAUDE_API_KEY env var' });

  const questionText = String(question || '').trim();
  if (!questionText) return res.status(400).json({ error: 'question field is required' });

  const contextLines: string[] = [];
  if (gross_salary)      contextLines.push(`Gross salary: $${Number(gross_salary).toLocaleString()}/yr`);
  if (take_home)         contextLines.push(`Annual net take-home: $${Number(take_home).toLocaleString()}`);
  if (state)             contextLines.push(`State: ${state}`);
  if (market_percentile != null) contextLines.push(`Market percentile: ${market_percentile}th percentile for their role`);
  if (expenses)          contextLines.push(`Monthly expenses: $${Number(expenses).toLocaleString()}`);
  if (framework)         contextLines.push(`Budget framework: ${framework}`);

  const prompt = `USER FINANCIAL CONTEXT:\n${contextLines.join('\n') || '(no context provided)'}\n\nQUESTION:\n${questionText}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
        body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        system: `You are RoboFinancer's compensation clarity advisor — not a financial advisor.

Rules you must follow:
- Always reference the user's specific numbers. Never give generic advice.
- Frame everything as "observations" or "insights," never as "financial advice" or "legal advice."
- Structure every response with exactly three parts: one observation about their situation, one specific suggestion, one concrete next action.
- Stay under 150 words total. Be direct and specific.
- Use plain English. No acronyms without explanation.
- When market_percentile is present: comment on whether their comp is competitive or not.
- When state is CA: acknowledge that CA SDI (1.1%) and high state tax (up to 13.3%) affect real take-home.
- Never recommend specific stocks, ETFs, funds, or financial products by name.
- If a question falls outside compensation, tax, or budgeting, say: "That's outside my focus area — I can help most with comp, taxes, and budgeting."`,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Anthropic API error', resp.status, txt);
      // Surface the model + status so misconfiguration is obvious in browser console
      return res.status(502).json({
        error: 'Upstream AI API error',
        status: resp.status,
        details: txt,
        model: 'claude-3-5-sonnet-20241022',
      });
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
