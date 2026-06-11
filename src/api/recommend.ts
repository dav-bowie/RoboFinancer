// Vercel serverless function to forward requests to Anthropic (Claude) Messages API
// Implements a simple in-memory rate limiter (best-effort in serverless env).

const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const buckets = new Map();

// Model wired per product owner request — confirmed working for this account.
// The error path below still surfaces the real Anthropic status + body so any
// future model-name issue is obvious rather than silently degrading.
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

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

function num(value: any): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value: number | null): string {
  if (value == null) return 'unknown';
  return Math.round(value).toLocaleString('en-US');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIpKey(req);
  if (!allowRequest(ip)) return res.status(429).json({ error: 'Rate limit exceeded: max 10 requests per minute' });

  const body = req.body || {};
  const {
    gross_salary,
    state,
    filing_status,
    take_home,
    monthly_take_home,
    k401_amount,
    k401_type,
    market_percentile,
    question,
  } = body;

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing CLAUDE_API_KEY env var' });

  const questionText = String(question || '').trim();
  if (!questionText) return res.status(400).json({ error: 'question field is required' });

  const grossSalary = num(gross_salary);
  const takeHome = num(take_home);
  const monthlyTakeHome = num(monthly_take_home) ?? (takeHome != null ? takeHome / 12 : null);
  const k401Amount = num(k401_amount);
  const percentile = num(market_percentile);

  const systemPrompt = `You are RoboFinancer AI — a compensation clarity and personal finance assistant built specifically for tech professionals evaluating job offers, understanding their paycheck, and optimizing their finances.

ROLE AND TONE:
- You are direct, specific, and number-driven
- You always reference the user's actual numbers from their context — never give generic advice
- You are conversational but professional
- You frame everything as "insights" not "advice" (legal requirement — never say "you should" or "I recommend" — say "based on your numbers" or "one option to consider")
- Keep responses under 120 words unless the user explicitly asks for more detail
- Use bullet points for lists of 3+ items
- Never use emojis

WHAT YOU CAN HELP WITH:
- Explaining the user's tax breakdown and why numbers are what they are
- Comparing job offers after taxes and cost of living
- Explaining 401k vs Roth IRA tradeoffs
- Salary negotiation talking points
- Understanding equity, RSUs, and bonus structures
- Budgeting frameworks and savings rate analysis
- Whether their compensation is above/below market

GUARDRAILS — STRICTLY ENFORCE:
- If the user asks about anything unrelated to personal finance, compensation, taxes, budgeting, or career decisions, respond with exactly: "I'm focused on compensation and finance questions. Try asking about your taxes, salary, savings, or job offer."
- Never discuss politics, relationships, health, or anything outside financial topics
- Never make specific investment recommendations (don't say "buy X stock" or "invest in Y fund")
- Always end responses with one concrete next action the user can take

USER CONTEXT (use these numbers in every response):
Gross salary: $${money(grossSalary)}
State: ${state || 'unknown'}
Filing status: ${filing_status || 'unknown'}
Take-home: $${money(takeHome)}/yr ($${money(monthlyTakeHome)}/mo)
401k contribution: $${money(k401Amount)} (${k401_type || 'unknown'})
Market percentile: ${percentile != null ? percentile : 'unknown'}th percentile`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: questionText }],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      // Surface the model + status + Anthropic error body so misconfiguration
      // (e.g. an invalid model name) is immediately obvious instead of silently
      // degrading. The frontend logs this and shows it in dev.
      console.error('Anthropic API error', resp.status, 'model=', CLAUDE_MODEL, txt);
      return res.status(502).json({
        error: 'Upstream AI API error',
        status: resp.status,
        details: txt,
        model: CLAUDE_MODEL,
      });
    }

    const data = await resp.json();
    // Response text path per Messages API: data.content[0].text
    const answer = Array.isArray(data?.content) ? data.content[0]?.text : undefined;

    if (!answer) {
      console.error('Anthropic API returned no text content', JSON.stringify(data));
      return res.status(502).json({
        error: 'Upstream AI API returned no content',
        model: CLAUDE_MODEL,
        details: data,
      });
    }

    return res.status(200).json({ answer });
  } catch (err: any) {
    console.error('Error forwarding to Anthropic:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: String(err?.message || err),
      model: CLAUDE_MODEL,
    });
  }
}
