// Stub — requires CLAUDE_API_KEY set in the server environment (api/recommend.ts).
// Never expose CLAUDE_API_KEY to the browser. All requests go through the serverless proxy.

export interface RecommendationContext {
  role: string;
  level: string;
  city: string;
  totalComp: number;
  grossSalary: number;
  netTakeHome: number;
  state: string;
  retirementRate: number;
}

export interface RecommendationResult {
  response: string;
  error?: string;
}

/**
 * Fetches an AI-generated compensation recommendation via the serverless proxy.
 * The proxy keeps CLAUDE_API_KEY server-side; this function never handles it.
 *
 * @param context - User's current financial context (role, comp, location, etc.)
 * @param userMessage - The user's natural-language question
 * @returns Resolved recommendation text, or an error string
 * @example
 *   const result = await fetchAIRecommendation(ctx, 'Should I negotiate my base?');
 *   if (!result.error) console.log(result.response);
 */
export async function fetchAIRecommendation(
  context: RecommendationContext,
  userMessage: string
): Promise<RecommendationResult> {
  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, message: userMessage }),
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    return { response: data.response };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { response: '', error: message };
  }
}
