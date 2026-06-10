import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, ChevronDown } from "lucide-react";
import { fmtCurrency } from "../../lib/calculations";

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
}

function generateResponse(input: string, ctx: Context): string {
  const q = input.toLowerCase();
  const monthlyTakeHome = ctx.netTakeHome / 12;

  if (q.includes("negotiat") || q.includes("raise") || q.includes("counter")) {
    const gap = ctx.totalComp > 0 ? ctx.totalComp * 0.15 : 30000;
    return `Based on your ${ctx.level} ${ctx.role} role in ${ctx.city}, here are three negotiation talking points:\n\n1. **Anchor to market data.** Cite Levels.fyi and Glassdoor — reference a range of ${fmtCurrency(
      ctx.totalComp * 1.1
    )}–${fmtCurrency(ctx.totalComp * 1.25)} for your level in this market. Never quote a single number.\n\n2. **Total comp, not just base.** If base movement is limited, negotiate a higher equity refresh or a one-time sign-on bonus of ${fmtCurrency(
      gap
    )}–${fmtCurrency(gap * 1.5)} to bridge the gap.\n\n3. **Create urgency, not desperation.** "I have a competing offer I'm evaluating" is powerful even if the other offer is early-stage.`;
  }

  if (q.includes("budget") || q.includes("spend") || q.includes("saving")) {
    const savings = monthlyTakeHome * 0.2;
    return `With a monthly take-home of ${fmtCurrency(monthlyTakeHome)}, here's a grounded 50/30/20 breakdown for ${ctx.city}:\n\n• **Needs (50%): ${fmtCurrency(
      monthlyTakeHome * 0.5
    )}/mo** — housing is typically 25–30% of take-home. In ${ctx.city}, that's ${fmtCurrency(monthlyTakeHome * 0.27)} for rent.\n• **Wants (30%): ${fmtCurrency(monthlyTakeHome * 0.3)}/mo** — dining, entertainment, travel.\n• **Savings (20%): ${fmtCurrency(savings)}/mo** — that's ${fmtCurrency(savings * 12)}/year, enough to max your Roth IRA ($7,000) and still contribute meaningfully to taxable investments.`;
  }

  if (
    q.includes("seattle") ||
    q.includes("san francisco") ||
    q.includes("new york") ||
    q.includes("austin") ||
    q.includes("relocat") ||
    q.includes("city")
  ) {
    return `If you moved from ${ctx.city} to a lower cost-of-living city, your ${fmtCurrency(ctx.netTakeHome)} annual take-home would go further:\n\n• **Austin, TX**: No state income tax + CoL ~35% lower than SF. Equivalent purchasing power: ${fmtCurrency(
      ctx.netTakeHome * 1.45
    )}\n• **Seattle, WA**: No state income tax, CoL moderate. Equivalent: ${fmtCurrency(ctx.netTakeHome * 1.22)}\n• **Denver, CO**: 4.4% flat tax, CoL ~27% lower than SF. Equivalent: ${fmtCurrency(ctx.netTakeHome * 1.28)}\n\nThis is purchasing power parity, not raw salary — your lifestyle in Austin at ${fmtCurrency(ctx.grossSalary * 0.85)} would feel equivalent to your current situation.`;
  }

  if (q.includes("equity") || q.includes("rsu") || q.includes("stock") || q.includes("vesting")) {
    return `Equity is frequently the most misunderstood part of tech comp. Key points:\n\n1. **Vesting schedule matters.** Most equity is 4-year with a 1-year cliff. If you leave at month 11, you get nothing.\n\n2. **Valuation risk.** RSUs at public companies are cash-equivalent at vest. Private company equity has high uncertainty — discount by 50–80% in your mental model unless you have strong signals.\n\n3. **Refresh grants.** After year 2, high performers typically receive refreshes that sustain total comp. Ask about the refresh philosophy in your offer call.\n\n4. **Tax treatment.** RSUs are taxed as ordinary income at vest — your ${ctx.state} state taxes apply. ISOs have favorable tax treatment but introduce AMT risk at higher amounts.`;
  }

  if (q.includes("401k") || q.includes("retirement") || q.includes("ira") || q.includes("invest")) {
    const maxContrib = 23000;
    const currentContrib = ctx.grossSalary * (ctx.retirementRate / 100);
    return `At your income level, tax-advantaged accounts are among the highest-leverage financial moves you can make.\n\n• **401(k)**: IRS limit is ${fmtCurrency(maxContrib)} in 2024. You're currently contributing ${fmtCurrency(
      currentContrib
    )}/yr (${ctx.retirementRate}%). ${currentContrib < maxContrib ? `You have room to increase by ${fmtCurrency(maxContrib - currentContrib)}.` : "You're maxed out — excellent."}\n\n• **Roth IRA**: If your income is under $161K (single), contribute $7,000. Above that, use the backdoor Roth.\n\n• **HSA**: If you have a high-deductible health plan, contribute the $4,150 single limit. It's triple-tax-advantaged.`;
  }

  if (q.includes("tax") || q.includes("withhold") || q.includes("w-4") || q.includes("refund")) {
    return `A few things to know about your tax situation in ${ctx.state}:\n\n• Your estimated federal effective rate is around ${(((ctx.grossSalary * 0.22 - 5000) / ctx.grossSalary) * 100).toFixed(1)}% — but your marginal rate on the next dollar earned is higher.\n\n• ${ctx.state === "CA" ? "California's top marginal rate hits 13.3% above $1M, but the 9.3% bracket starts at $68K. You're likely paying 8–9.3% on most of your income." : ctx.state === "WA" || ctx.state === "TX" || ctx.state === "FL" ? `${ctx.state} has no state income tax — a meaningful perk that's worth ${fmtCurrency(
      ctx.grossSalary * 0.06
    )}–${fmtCurrency(ctx.grossSalary * 0.09)} annually vs. high-tax states.` : "Your state rate is in the moderate range — not as punishing as CA or NY."}\n\n• Adjust your W-4 if you're getting a large refund or owed a lot — that means your withholding is off.`;
  }

  if (q.includes("offer") || q.includes("should i take") || q.includes("worth it")) {
    return `To evaluate whether an offer is worth taking, I look at five dimensions:\n\n1. **After-tax, CoL-adjusted comp** — use the Offer Comparison module for a real number.\n2. **Equity quality** — public RSUs vs. private options are very different.\n3. **Commute cost** — 1 hour daily commute costs ~250 hours/year. At your implied hourly rate, that's ${fmtCurrency((ctx.grossSalary / 2000) * 250)}.\n-4. **Career trajectory** — will this role put you in the top percentile in 2 years?\n-5. **Team and manager** — this is the hardest to quantify but often the deciding factor.\n-\n-Want me to run a specific comparison?`;
  }

  return `I'm RoboFinancer's AI advisor. I have context on your ${ctx.role} role in ${ctx.city} earning ${fmtCurrency(ctx.totalComp)} total comp.\n\nI can help with:\n• Salary negotiation talking points\n• Tax breakdowns and withholding\n• Budgeting for your income level\n• City comparison and cost of living\n• Equity and retirement strategy\n• Offer evaluation\n\nWhat would you like to dig into?`;
}

export function AIAssistant({ context }: { context: Context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hey — I'm your RoboFinancer advisor. I can see you're a ${context.role || "tech professional"} in ${context.city || "your city"} earning around ${context.totalComp > 0 ? fmtCurrency(context.totalComp) : "an amount you haven't entered yet"} in total comp.\n\nAsk me anything: negotiation tactics, tax strategy, budget recommendations, or whether to take that new offer.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    if (!input.trim() || typing) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    // Build request payload per spec
    const payload = {
      gross_salary: context.grossSalary ?? null,
      state: context.state ?? null,
      take_home: context.netTakeHome ?? null,
      expenses: null,
      framework: null,
      market_percentile: context.percentile ?? null,
      question: userMsg.content,
    };

    try {
      const resp = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("/api/recommend error:", resp.status, text);
        const fallback = generateResponse(userMsg.content, context);
        setMessages((m) => [...m, { role: "assistant", content: fallback }]);
      } else {
        const data = await resp.json();
        const answer = data?.answer ?? data?.result ?? null;
        if (answer) setMessages((m) => [...m, { role: "assistant", content: String(answer) }]);
        else {
          const fallback = generateResponse(userMsg.content, context);
          setMessages((m) => [...m, { role: "assistant", content: fallback }]);
        }
      }
    } catch (err) {
      console.error("Error calling /api/recommend:", err);
      const fallback = generateResponse(userMsg.content, context);
      setMessages((m) => [...m, { role: "assistant", content: fallback }]);
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

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-50"
      >
        {open ? <ChevronDown size={20} /> : <MessageSquare size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 w-80 sm:w-96 h-[520px] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
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
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border px-3 py-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about your comp, taxes, offers..."
              className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={send} disabled={!input.trim() || typing} className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors">
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
