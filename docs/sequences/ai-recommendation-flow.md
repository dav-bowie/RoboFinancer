# Sequence: AI Recommendation Flow

## Happy path (API key configured)

```
User types message in AIAssistant chat panel
        │
        ▼
AIAssistant.tsx: calls useAIRecommendation().getRecommendation(context, message)
        │
        ▼
useAIRecommendation.ts: setLoading(true)
        │
        ▼
aiRecommendations.ts: fetchAIRecommendation()
        │  POST /api/recommend
        │  body: { context: { role, level, city, totalComp, ... }, message }
        ▼
api/recommend.ts (Vercel serverless, Node.js)
        │  reads process.env.CLAUDE_API_KEY
        │  calls Anthropic Messages API
        │  model: claude-sonnet-4-6
        │  max_tokens: 1024
        ▼
Anthropic API
        │  returns { content: [{ type: 'text', text: '...' }] }
        ▼
api/recommend.ts: res.status(200).json({ response: text })
        │
        ▼
fetchAIRecommendation: returns { response: string }
        │
        ▼
useAIRecommendation: setLoading(false), returns response string
        │
        ▼
AIAssistant.tsx: appends assistant message to messages array
        │
        ▼
UI renders the response in the chat panel
```

## Error path (API key missing or rate limited)

```
api/recommend.ts: returns 501 or 5xx
        │
        ▼
fetchAIRecommendation: catches error, returns { response: '', error: '...' }
        │
        ▼
useAIRecommendation: setError(message), returns ''
        │
        ▼
AIAssistant.tsx: renders fallback rule-based response (current behavior)
```

## Context object schema

```typescript
{
  role: string;           // from BenchmarkModule
  level: string;
  city: string;
  totalComp: number;
  grossSalary: number;    // from TakeHomeModule
  netTakeHome: number;
  state: string;
  retirementRate: number;
}
```

## Security invariant

`CLAUDE_API_KEY` is only read in the Vercel serverless runtime — never in the browser bundle. The client receives only the response text.
