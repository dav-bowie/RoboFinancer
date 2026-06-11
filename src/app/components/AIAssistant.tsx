import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, ChevronDown } from "lucide-react";
import { fmtCurrency, getMarginalBracket } from "../../lib/calculations";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Context {
  role: string;
  level: string;
  city: string;
  totalComp: number;
  netTakeHome: number;
  grossSalary: number;
  state: string;
  retirementRate: number;
  percentile?: number;
  filingStatus: "single" | "married";
  k401Type: "traditional" | "roth";
  k401Amount: number;
  employerMatch: number;
  rothIRA: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  caSDI: number;
}

// ── Token / cost protection constants ───────────────────────────────────────
const MAX_CHARS = 280;
const SESSION_LIMIT = 8;
const SESSION_KEY = "robofinancer_api_calls";

const OFFTOPIC_MSG =
  "I'm focused on compensation and finance. Ask me about your taxes, salary, job offer, or savings.";

const EXHAUSTION_MSG =
  "You've used all 8 AI questions for this session — that's the limit to keep things fast and free. The quick action buttons below still give you instant answers with no limit, or refresh the page to start a new session.";

const PROD_ERROR_MSG =
  "I couldn't reach the AI right now. Try one of the quick action buttons for instant answers, or refresh and try again.";

// Topic-signal keywords — if a message contains none of these (case-insensitive),
// it's treated as off-topic and answered instantly without an API call.
const TOPIC_SIGNALS = [
  "salary", "comp", "compensation", "pay", "paycheck", "income", "wage", "earn",
  "tax", "taxes", "withhold", "w-4", "w4", "refund", "deduction", "bracket",
  "marginal", "effective", "fica", "medicare", "social security",
  "401k", "401(k)", "ira", "roth", "traditional", "retirement", "pension",
  "invest", "saving", "save", "savings", "budget", "spend", "expense", "rent",
  "offer", "negotiat", "raise", "counter", "promotion", "career", "job",
  "equity", "rsu", "stock", "vesting", "vest", "bonus", "options", "grant",
  "take-home", "take home", "net", "gross", "percentile", "market", "fair",
  "cost of living", "col", "relocat", "city", "state", "hsa", "match",
  "money", "financ", "dollar", "$", "afford", "wealth", "fund", "portfolio",
];

function isOnTopic(text: string): boolean {
  const q = text.toLowerCase();
  return TOPIC_SIGNALS.some((kw) => q.includes(kw));
}

// ── Quick action answer builders (assembled CLIENT-SIDE — no API call) ───────
function totalTaxesOf(ctx: Context): number {
  return ctx.federalTax + ctx.stateTax + ctx.socialSecurity + ctx.medicare + (ctx.caSDI || 0);
}

function marginalInfo(ctx: Context): { label: string; rate: number; taxable: number } {
  const std = ctx.filingStatus === "married" ? 29200 : 14600;
  const trad = ctx.k401Type === "traditional" ? ctx.k401Amount : 0;
  const taxable = Math.max(0, ctx.grossSalary - std - trad);
  const label = getMarginalBracket(taxable, ctx.filingStatus);
  return { label, rate: parseFloat(label) / 100, taxable };
}

function buildTaxBreakdown(ctx: Context): string {
  const total = totalTaxesOf(ctx);
  const gross = ctx.grossSalary || 0;
  const effective = gross > 0 ? ((total / gross) * 100).toFixed(1) : "0";
  const keep = gross > 0 ? (((gross - total) / gross) * 100).toFixed(1) : "0";
  const monthly = ctx.netTakeHome / 12;
  const lines = [
    `Your total tax burden is about **${fmtCurrency(total)}/yr**. Based on your numbers:`,
    ``,
    `• **Federal income tax:** ${fmtCurrency(ctx.federalTax)}`,
    `• **Social Security:** ${fmtCurrency(ctx.socialSecurity)} (6.2% up to the wage base)`,
    `• **Medicare:** ${fmtCurrency(ctx.medicare)} (1.45%)`,
    `• **${ctx.state} state tax:** ${fmtCurrency(ctx.stateTax)}`,
  ];
  if (ctx.caSDI && ctx.caSDI > 0) {
    lines.push(`• **CA SDI:** ${fmtCurrency(ctx.caSDI)} (1.1%, California only)`);
  }
  lines.push(
    ``,
    `That's an effective tax rate of **${effective}%** on your ${fmtCurrency(gross)} gross — you keep **${keep}%** as take-home (${fmtCurrency(ctx.netTakeHome)}/yr, ${fmtCurrency(monthly)}/mo).`,
    ``,
    `Next: open the Take-Home tab and nudge your 401(k) rate up to watch federal and state tax drop.`
  );
  return lines.join("\n");
}

function buildSavingsAnswer(ctx: Context): string {
  const gross = ctx.grossSalary || 0;
  const annual = ctx.k401Amount + ctx.rothIRA;
  const pct = gross > 0 ? (annual / gross) * 100 : 0;
  const pctStr = pct.toFixed(1);
  const match = ctx.employerMatch || 0;
  const total = annual + match;

  let tier: string;
  if (pct > 15) {
    tier = `At **${pctStr}%** of gross, you're saving aggressively — comfortably above the ~15% benchmark most planners cite for tech professionals.`;
  } else if (pct >= 10) {
    tier = `At **${pctStr}%** of gross, you're in a solid range — 10–15% is a common target.`;
  } else {
    tier = `At **${pctStr}%** of gross, you're below the ~10–15% range many aim for. One option to consider: bumping your 401(k) rate a few points, especially up to any employer match.`;
  }

  const matchLine =
    match > 0
      ? `Your employer adds ${fmtCurrency(match)}/yr in match — that's free money, bringing total retirement contributions to **${fmtCurrency(total)}/yr**.`
      : `No employer match is entered. If your employer offers one, that's free money worth capturing first.`;

  return [
    `You're putting away **${fmtCurrency(annual)}/yr** across your 401(k) (${fmtCurrency(ctx.k401Amount)}) and Roth IRA (${fmtCurrency(ctx.rothIRA)}).`,
    ``,
    tier,
    ``,
    matchLine,
    ``,
    `Next: open the Take-Home tab to model a higher contribution rate and see the take-home impact.`,
  ].join("\n");
}

function buildEffectiveRateAnswer(ctx: Context): string {
  const gross = ctx.grossSalary || 0;
  const total = totalTaxesOf(ctx);
  const effective = gross > 0 ? ((total / gross) * 100).toFixed(1) : "0";
  const keep = gross > 0 ? (((gross - total) / gross) * 100).toFixed(1) : "0";
  const { label: marginal } = marginalInfo(ctx);
  return [
    `Two different numbers people often mix up:`,
    ``,
    `• **Effective rate: ${effective}%** — your total taxes (${fmtCurrency(total)}) divided by your ${fmtCurrency(gross)} gross. It's what you actually pay across all your income.`,
    `• **Marginal rate: ${marginal}** — the federal rate on your *next* dollar earned. It looks scarier, but it only applies to the top slice of your income, not the whole thing.`,
    ``,
    `Net effect: you keep about **${keep}%** of gross (${fmtCurrency(ctx.netTakeHome)}/yr).`,
    ``,
    `Next: try a raise scenario in the Take-Home tab to see how only the top slice gets taxed at the marginal rate.`,
  ].join("\n");
}

function buildRothVsTradAnswer(ctx: Context): string {
  const { label: marginal, rate } = marginalInfo(ctx);
  const contrib = ctx.k401Amount;

  if (contrib <= 0) {
    return [
      `You're not contributing to a 401(k) yet, so there's no tax tradeoff to weigh right now. Here's the core difference:`,
      ``,
      `• **Traditional (pre-tax):** lowers your taxable income today, but withdrawals in retirement are taxed.`,
      `• **Roth (post-tax):** no break today, but qualified withdrawals — including growth — are tax-free later.`,
      ``,
      `Based on your ${marginal} marginal bracket, Traditional tends to win if you expect a lower bracket in retirement; Roth tends to win if you expect a higher one.`,
      ``,
      `Next: set a 401(k) rate in the Take-Home tab and toggle Traditional vs Roth to compare.`,
    ].join("\n");
  }

  const taxSavings = contrib * rate;

  if (ctx.k401Type === "traditional") {
    return [
      `You're contributing **${fmtCurrency(contrib)}/yr** to a **Traditional 401(k)** (pre-tax).`,
      ``,
      `• That lowers your taxable income now, saving roughly **${fmtCurrency(taxSavings)}** this year at your ${marginal} marginal rate.`,
      `• The tradeoff: withdrawals in retirement are taxed as ordinary income.`,
      `• A **Roth 401(k)** flips this — no break today, but qualified withdrawals (including growth) are tax-free.`,
      ``,
      `One option to consider: Roth tends to win if you expect to be in a higher bracket later in your career.`,
      ``,
      `Next: toggle the 401(k) type in the Take-Home tab to see the take-home difference side by side.`,
    ].join("\n");
  }

  return [
    `You're contributing **${fmtCurrency(contrib)}/yr** to a **Roth 401(k)** (post-tax).`,
    ``,
    `• You pay tax now at your ${marginal} marginal rate, but qualified withdrawals — including all growth — are tax-free in retirement.`,
    `• A **Traditional 401(k)** flips this — it would lower your taxable income today by about **${fmtCurrency(taxSavings)}**, but withdrawals get taxed later.`,
    ``,
    `Based on your numbers, Roth is a strong fit if you expect a higher bracket in retirement than today.`,
    ``,
    `Next: toggle the 401(k) type in the Take-Home tab to compare lifetime tax treatment.`,
  ].join("\n");
}

interface QuickAction {
  id: string;
  label: (ctx: Context) => string;
  build: (ctx: Context) => string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "tax",
    label: (ctx) => `Why is my tax ${fmtCurrency(totalTaxesOf(ctx))}?`,
    build: buildTaxBreakdown,
  },
  {
    id: "saving",
    label: () => "Am I saving enough?",
    build: buildSavingsAnswer,
  },
  {
    id: "effective",
    label: () => "What's my effective tax rate?",
    build: buildEffectiveRateAnswer,
  },
  {
    id: "roth",
    label: () => "Roth vs Traditional 401k?",
    build: buildRothVsTradAnswer,
  },
];

// ── Guided follow-up chips (each fires a real API call) ──────────────────────
const GUIDED_CHIPS: { label: string; prompt: string }[] = [
  {
    label: "Salary negotiation",
    prompt:
      "Give me three specific talking points to negotiate a higher offer, using my current comp and market percentile.",
  },
  {
    label: "Compare an offer",
    prompt:
      "I have another job offer. How should I compare it to my current comp after taxes and cost of living?",
  },
  {
    label: "Reduce my taxes",
    prompt:
      "What are concrete ways I could lower my tax bill given my salary, state, and 401(k) setup?",
  },
  {
    label: "Explain my equity",
    prompt:
      "Explain how my equity and RSUs work, including vesting schedules and how they're taxed.",
  },
];

function errorMessage(status?: number, details?: string): string {
  if (import.meta.env.DEV) {
    const parts = [`[dev] AI request failed${status ? ` (HTTP ${status})` : ""}.`];
    if (details) parts.push(details);
    return parts.join("\n\n");
  }
  return PROD_ERROR_MSG;
}

export function AIAssistant({ context }: { context: Context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hey — I'm your RoboFinancer advisor. I can see you're a ${context.role || "tech professional"} in ${context.city || "your city"} earning around ${context.totalComp > 0 ? fmtCurrency(context.totalComp) : "an amount you haven't entered yet"} in total comp.\n\nTap a quick question below for an instant answer, or ask me anything about your taxes, savings, or job offer.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [apiCalls, setApiCalls] = useState(() => {
    if (typeof sessionStorage === "undefined") return 0;
    return Number(sessionStorage.getItem(SESSION_KEY)) || 0;
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasUserMessage = messages.some((m) => m.role === "user");
  const exhausted = apiCalls >= SESSION_LIMIT;
  // Quick actions show before the first message AND whenever the session is
  // exhausted, so a free instant-answer path always remains available.
  const showQuickActions = !hasUserMessage || exhausted;

  useEffect(() => {
    if (open && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const runQuickAction = (qa: QuickAction) => {
    const answer = qa.build(context);
    setMessages((m) => [
      ...m,
      { role: "user", content: qa.label(context) },
      { role: "assistant", content: answer },
    ]);
  };

  const send = async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || typing) return;
    if (text.length > MAX_CHARS) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    // Frontend topic guardrail — answer off-topic questions instantly, no API call.
    if (!isOnTopic(text)) {
      setMessages((m) => [...m, { role: "assistant", content: OFFTOPIC_MSG }]);
      return;
    }

    // Session message limit — only real API calls are counted.
    if (apiCalls >= SESSION_LIMIT) {
      setMessages((m) => [...m, { role: "assistant", content: EXHAUSTION_MSG }]);
      return;
    }

    const newCount = apiCalls + 1;
    setApiCalls(newCount);
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SESSION_KEY, String(newCount));

    setTyping(true);

    const payload = {
      gross_salary: context.grossSalary ?? null,
      state: context.state ?? null,
      filing_status: context.filingStatus ?? null,
      take_home: context.netTakeHome ?? null,
      monthly_take_home: context.netTakeHome ? context.netTakeHome / 12 : null,
      k401_amount: context.k401Amount ?? null,
      k401_type: context.k401Type ?? null,
      market_percentile: context.percentile ?? null,
      question: text,
    };

    try {
      const resp = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("/api/recommend error:", resp.status, errText);
        setMessages((m) => [...m, { role: "assistant", content: errorMessage(resp.status, errText) }]);
      } else {
        const data = await resp.json();
        const answer = data?.answer ?? null;
        if (answer) {
          setMessages((m) => [...m, { role: "assistant", content: String(answer) }]);
        } else {
          console.error("/api/recommend: empty answer body", data);
          setMessages((m) => [...m, { role: "assistant", content: errorMessage(resp.status, JSON.stringify(data)) }]);
        }
      }
    } catch (err) {
      console.error("Error calling /api/recommend:", err);
      setMessages((m) => [...m, { role: "assistant", content: errorMessage(undefined, String(err)) }]);
    } finally {
      setTyping(false);
    }
  };

  const formatContent = (text: string) =>
    text.split("\n").map((line, i) => {
      const boldPattern = /\*\*(.*?)\*\*/g;
      const parts: React.ReactNode[] = [];
      let last = 0;
      let match;
      while ((match = boldPattern.exec(line)) !== null) {
        if (match.index > last) parts.push(line.slice(last, match.index));
        parts.push(
          <strong key={match.index} className="text-foreground font-medium">
            {match[1]}
          </strong>
        );
        last = match.index + match[0].length;
      }
      if (last < line.length) parts.push(line.slice(last));
      return (
        <p key={i} className={line === "" ? "h-2" : "leading-relaxed"}>
          {parts.length > 0 ? parts : line}
        </p>
      );
    });

  const counterColor =
    input.length >= MAX_CHARS ? "text-red-400" : input.length >= 250 ? "text-orange-400" : "text-muted-foreground";

  const sendDisabled = !input.trim() || input.length > MAX_CHARS || typing;

  return (
    <>
      <button
        onClick={() => setOpen((v: boolean) => !v)}
        className="fixed bottom-6 right-4 sm:right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-50"
      >
        {open ? <ChevronDown size={20} /> : <MessageSquare size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-2 left-2 sm:left-auto sm:right-6 sm:w-96 h-[min(560px,calc(100dvh-88px))] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">RoboFinancer AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed space-y-1 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  {msg.role === "assistant" ? formatContent(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-xl px-3 py-2.5 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Guided follow-up chips — appear after the first message */}
            {hasUserMessage && !typing && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {GUIDED_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => send(chip.prompt)}
                    disabled={typing}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-40"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick action buttons — FREE, assembled client-side, no API call */}
          {showQuickActions && (
            <div className="border-t border-border px-3 pt-3 pb-1">
              {exhausted && (
                <div className="text-[11px] text-muted-foreground mb-2">
                  Free instant answers — no session limit:
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.id}
                    onClick={() => runQuickAction(qa)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {qa.label(context)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border px-3 py-3 space-y-1.5">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                maxLength={MAX_CHARS}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about your comp, taxes, offers..."
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={() => send()} disabled={sendDisabled} className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors">
                <Send size={13} />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">
                {Math.min(apiCalls, SESSION_LIMIT)} of {SESSION_LIMIT} AI questions used
              </span>
              <span className={counterColor}>
                {input.length}/{MAX_CHARS}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
