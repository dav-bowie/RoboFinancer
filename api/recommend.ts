// Vercel serverless function — proxies requests to the Anthropic API.
// Keeps CLAUDE_API_KEY server-side; it is never sent to the browser.
//
// To activate:
//   1. pnpm add @anthropic-ai/sdk
//   2. Set CLAUDE_API_KEY in Vercel project environment variables (not .env.local)
//   3. Uncomment the Anthropic client block below

type RequestBody = {
  context: Record<string, unknown>;
  message: string;
};

// Minimal Vercel handler types (avoids requiring @vercel/node as a dep for a stub)
type VercelRequest = { method?: string; body: RequestBody };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { context, message } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  // Uncomment after installing @anthropic-ai/sdk:
  //
  // const Anthropic = (await import('@anthropic-ai/sdk')).default;
  // const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  //
  // const aiResponse = await client.messages.create({
  //   model: 'claude-sonnet-4-6',
  //   max_tokens: 1024,
  //   system: [
  //     'You are RoboFinancer, an AI financial advisor for tech professionals.',
  //     'Be concise, data-driven, and specific to the user\'s context.',
  //     'Never give generic advice. Always reference real numbers.',
  //     `User context: ${JSON.stringify(context)}`,
  //   ].join(' '),
  //   messages: [{ role: 'user', content: message }],
  // });
  //
  // const text =
  //   aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';
  // res.status(200).json({ response: text });
  // return;

  void context;
  res.status(501).json({
    error: 'AI endpoint not yet configured. Set CLAUDE_API_KEY and activate the Anthropic client.',
  });
}
