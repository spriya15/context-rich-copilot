import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Brain, GraduationCap, Code2, Loader2, AlertTriangle, Lightbulb, Sparkles, CheckCircle2 } from "lucide-react";

const API = "https://aye-explain-experiences-recruitment.trycloudflare.com";

type Preference = { category: string; value: string; text?: string };

const CONTEXTS = ["default", "typescript", "python"] as const;
type Ctx = (typeof CONTEXTS)[number];

const CATEGORY_COLORS: Record<string, string> = {
  language: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  framework: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  style: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  tooling: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  testing: "bg-green-500/15 text-green-300 border-green-500/40",
  architecture: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  other: "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

function catColor(c: string) {
  return CATEGORY_COLORS[c?.toLowerCase()] ?? CATEGORY_COLORS.other;
}

function ContextSelect({ value, onChange }: { value: Ctx; onChange: (v: Ctx) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground uppercase tracking-wider">Context</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Ctx)}
        className="rounded-md bg-card border border-border px-2 py-1.5 text-sm font-mono text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        {CONTEXTS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}

function CtxBadge({ value }: { value: Ctx }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-indigo-500/40 bg-indigo-500/10 text-indigo-200 font-mono">
      <span className="size-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px] shadow-indigo-400/70" />
      {value}
    </span>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Context-Rich Copilot" },
      { name: "description", content: "A coding assistant that remembers your preferences across sessions." },
    ],
  }),
  component: App,
});

type MemoryMap = Record<Ctx, Preference[]>;
const emptyMemoryMap = (): MemoryMap => ({ default: [], typescript: [], python: [] });

async function fetchMemory(ctx: Ctx): Promise<Preference[]> {
  try {
    const r = await fetch(`${API}/memory?context=${encodeURIComponent(ctx)}`);
    const data = await r.json();
    const prefs: Preference[] = Array.isArray(data) ? data : data.preferences ?? data.memory ?? [];
    return prefs;
  } catch {
    return [];
  }
}

function App() {
  const [view, setView] = useState<"teach" | "review">("teach");
  const [activeCtx, setActiveCtx] = useState<Ctx>("typescript");
  const [memories, setMemories] = useState<MemoryMap>(emptyMemoryMap);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const refreshCtx = useCallback(async (ctx: Ctx) => {
    const prefs = await fetchMemory(ctx);
    setMemories((m) => ({ ...m, [ctx]: prefs }));
  }, []);

  const refreshAll = useCallback(async () => {
    const entries = await Promise.all(CONTEXTS.map(async (c) => [c, await fetchMemory(c)] as const));
    setMemories(Object.fromEntries(entries) as MemoryMap);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/health`);
        setBackendOk(r.ok);
      } catch {
        setBackendOk(false);
      }
    })();
    refreshAll();
  }, [refreshAll]);

  const memory = memories[activeCtx];
  const grouped = memory.reduce<Record<string, Preference[]>>((acc, p) => {
    const k = (p.category || "other").toLowerCase();
    (acc[k] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="dark min-h-screen flex bg-background text-foreground font-sans">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Brain className="size-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight">Context-Rich</h1>
            <p className="text-xs text-muted-foreground">Copilot</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          <NavBtn active={view === "teach"} onClick={() => setView("teach")} icon={<GraduationCap className="size-4" />} label="Teach" />
          <NavBtn active={view === "review"} onClick={() => setView("review")} icon={<Code2 className="size-4" />} label="Review" />
        </nav>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Memory</h2>
              <span className="text-[10px] text-muted-foreground">
                {memory.length > 0 ? `${memory.length} prefs` : ""}
              </span>
            </div>

            {/* Context tabs */}
            <div className="flex gap-1 mb-3 p-1 rounded-md bg-card border border-border">
              {CONTEXTS.map((c) => {
                const count = memories[c].length;
                const isActive = c === activeCtx;
                return (
                  <button
                    key={c}
                    onClick={() => setActiveCtx(c)}
                    title={`${c} · ${count} prefs`}
                    className={`flex-1 text-[10px] font-mono px-1.5 py-1 rounded transition ${
                      isActive
                        ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/50 shadow-[0_0_8px] shadow-indigo-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <div className="truncate">{c}</div>
                    <div className="text-[9px] opacity-70">{count} prefs</div>
                  </button>
                );
              })}
            </div>

            {memory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No memory in <span className="font-mono">{activeCtx}</span> yet.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Remembering {memory.length} preferences in <span className="font-mono text-indigo-300">{activeCtx}</span>
                </p>
                <div className="space-y-3">
                  {Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{cat}</div>
                      <div className="flex flex-wrap gap-1">
                        {items.map((p, i) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${catColor(cat)}`}>
                            {p.value || p.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border text-xs flex items-center gap-2">
          <span className={`size-2 rounded-full ${backendOk === null ? "bg-yellow-400 animate-pulse" : backendOk ? "bg-green-400 shadow-[0_0_8px] shadow-green-400/60" : "bg-red-500"}`} />
          <span className="text-muted-foreground">
            {backendOk === null ? "Checking..." : backendOk ? "Backend connected" : "Backend offline"}
          </span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {view === "teach" ? (
            <TeachView context={activeCtx} setContext={setActiveCtx} onSaved={refreshCtx} />
          ) : (
            <ReviewView context={activeCtx} setContext={setActiveCtx} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
        active ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/40" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TeachView({ context, setContext, onSaved }: { context: Ctx; setContext: (c: Ctx) => void; onSaved: (ctx: Ctx) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Preference[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`${API}/teach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, context }),
      });
      if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
      const data = await r.json();
      const prefs: Preference[] = data.preferences ?? data.saved ?? data ?? [];
      setResult(Array.isArray(prefs) ? prefs : []);
      setTimeout(() => onSaved(context), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session 1 — Teach Me Your Style</h1>
          <p className="text-sm text-muted-foreground mt-1">Describe your tech stack and coding preferences in plain English.</p>
        </div>
        <ContextSelect value={context} onChange={setContext} />
      </header>


      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="e.g. I use TypeScript with strict mode. I prefer React functional components with hooks. No var declarations, only const/let. I follow Airbnb ESLint rules. I write tests with Jest..."
        className="w-full rounded-lg bg-card border border-border p-4 text-sm font-sans resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />

      <button
        onClick={submit}
        disabled={loading || !text.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Parsing preferences and writing to memory...
          </>
        ) : (
          "Save Preferences"
        )}
      </button>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-300 font-medium">
            <CheckCircle2 className="size-5" />
            Saved {result.length} preferences to memory
          </div>
          <div className="space-y-2">
            {result.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`text-[10px] px-2 py-0.5 rounded border ${catColor(p.category)} uppercase font-medium`}>
                  {p.category || "other"}
                </span>
                <span className="text-foreground">{p.value || p.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewView({ context, setContext }: { context: Ctx; setContext: (c: Ctx) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ issues: string[]; suggestions: string[]; memory_used: Preference[] } | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`${API}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, context }),
      });
      if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
      const data = await r.json();
      setResult({
        issues: data.issues ?? [],
        suggestions: data.suggestions ?? [],
        memory_used: data.memory_used ?? data.recalled ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session 2 — Review My Code</h1>
          <p className="text-sm text-muted-foreground mt-1">Paste a code snippet. I'll review it against everything I remember about you.</p>
        </div>
        <ContextSelect value={context} onChange={setContext} />
      </header>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={14}
        placeholder="Paste your code here..."
        spellCheck={false}
        className="w-full rounded-lg bg-[#0b0f1a] border border-border p-4 text-sm font-mono text-slate-200 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={loading || !code.trim()}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Querying memory and reviewing code...
            </>
          ) : (
            "Review Code"
          )}
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>using</span>
          <CtxBadge value={context} />
        </div>
      </div>


      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      {result && (() => {
        const allClear = result.issues.length === 0 && result.suggestions.length === 0;
        return (
          <div className={`grid gap-4 ${allClear ? "md:grid-cols-1" : "md:grid-cols-3"}`}>
            {allClear ? (
              <div className="relative rounded-lg border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-900/30 to-green-900/20 p-6 shadow-[0_0_40px_-5px] shadow-emerald-500/50">
                <div className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-emerald-300/40 animate-pulse" />
                <div className="relative flex items-start gap-3">
                  <div className="text-2xl">✅</div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-200">Looks great! No issues found.</h3>
                    <p className="text-sm text-emerald-300/80 mt-1">This code matches all your remembered preferences.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <ResultCard
                  title="Issues Found"
                  tone="red"
                  icon={<AlertTriangle className="size-4" />}
                  items={result.issues}
                  bullet="⚠️"
                  empty="No issues found"
                />
                <ResultCard
                  title="Suggestions"
                  tone="blue"
                  icon={<Lightbulb className="size-4" />}
                  items={result.suggestions}
                  bullet="💡"
                  empty="No suggestions"
                />
              </>
            )}
            <div className="relative rounded-lg border border-purple-500/60 bg-gradient-to-br from-purple-900/30 to-indigo-900/20 p-4 shadow-[0_0_30px_-5px] shadow-purple-500/40">
              <div className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-purple-400/30 animate-pulse" />
              <div className="relative">
                <div className="flex items-center gap-2 text-purple-200 font-semibold text-sm">
                  <Sparkles className="size-4" />
                  Memory Used
                </div>
                <p className="mt-1 text-xs text-purple-300/80">Recalled from HydraDB:</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {result.memory_used.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">No memory recalled</span>
                  ) : (
                    result.memory_used.map((p, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded border ${catColor(p.category)} font-medium`}
                      >
                        {p.value || p.text}
                      </span>
                    ))
                  )}
                </div>
                <p className="mt-3 text-[10px] text-purple-300/60 italic">
                  These were retrieved from persistent memory — not hardcoded
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ResultCard({
  title, tone, icon, items, bullet, empty,
}: {
  title: string; tone: "red" | "blue"; icon: React.ReactNode; items: string[]; bullet: string; empty: string;
}) {
  const tones = {
    red: "border-red-500/40 bg-red-500/10 text-red-200",
    blue: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 font-semibold text-sm">
        {icon}
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {items.length === 0 ? (
          <li className="text-xs text-muted-foreground italic">{empty}</li>
        ) : (
          items.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span>{bullet}</span>
              <span className="text-foreground/90">{s}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
