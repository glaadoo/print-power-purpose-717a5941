// src/components/KenzieChat.tsx
import React, { useEffect, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase as singleton } from "@/integrations/supabase/client";

declare global {
  interface Window {
    kenzieOpenChat?: () => void;
  }
}

type Msg = { role: "user" | "assistant"; content: string };

const STARTER: Msg = {
  role: "assistant",
  content: `Woof woof! I'm Kenzie 🐾, your helpful AI assistant from Print Power Purpose! How can I fetch you some information today? I can help with:

• **Custom printing questions** (materials, designs, processes - you name it!)

• **Donations and causes** (how we give back, our partners, and how you can help)

• **Your order status** (just bark out your order number!)

• **Navigating our platform** (finding products, checking out, account help)

• **Anything else that's on your mind!**

Just let me know what you need!`,
};

// Helper to build a scoped supabase client with the session header
function makeScopedClient(sessionId: string): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  if (!url || !key) {
    console.error("Supabase config missing");
    throw new Error("Supabase configuration is missing");
  }

  return createClient(url, key, {
    global: {
      headers: { "x-ppp-session-id": sessionId },
    },
    auth: { persistSession: false },
  });
}

export default function KenzieChat() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([STARTER]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sb, setSb] = useState<SupabaseClient | null>(null); // scoped client with header
  const containerRef = useRef<HTMLDivElement>(null);

  // open on custom event
  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener("open-kenzie-chat", openHandler as any);
    return () => window.removeEventListener("open-kenzie-chat", openHandler as any);
  }, []);

  // expose global opener (window.kenzieOpenChat)
  useEffect(() => {
    window.kenzieOpenChat = () => setOpen(true);
    return () => {
      delete window.kenzieOpenChat;
    };
  }, []);

  // ensure session id, create scoped client, and load history
  useEffect(() => {
    (async () => {
      // 1) read from local storage or create
      let sid = localStorage.getItem("ppp:kenzie:session_id");
      if (!sid) {
        try {
          const { data, error } = await singleton
            .from("kenzie_sessions")
            .insert({})
            .select("id")
            .maybeSingle();
          if (error || !data?.id) {
            sid = crypto.randomUUID();
          } else {
            sid = data.id as string;
          }
        } catch {
          sid = crypto.randomUUID();
        }
        localStorage.setItem("ppp:kenzie:session_id", sid);
      }
      setSessionId(sid);

      // 2) build a scoped client with the header for all subsequent queries
      const scoped = makeScopedClient(sid);
      setSb(scoped);

      // 3) load last 40 messages (if any)
      const { data: msgs, error } = await scoped
        .from("kenzie_messages")
        .select("role, content, created_at")
        .order("created_at", { ascending: true })
        .limit(40);

      if (!error && msgs && msgs.length) {
        const m = msgs.map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
        setMessages(m);
      } else {
        // seed starter to DB if empty
        await scoped.from("kenzie_messages").insert({
          session_id: sid,
          role: "assistant",
          content: STARTER.content,
        });
      }
    })();
  }, []);

  // autoscroll
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages, open]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!sessionId || !sb || sending) return;

    const text = input.trim();
    if (!text) return;

    setInput("");
    setSending(true);

    // 1) write user message to DB
    await sb.from("kenzie_messages").insert({
      session_id: sessionId,
      role: "user",
      content: text,
    });

    // 2) show locally (optimistic)
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      // fetch recent context from DB too
      const history = await loadHistory(sb, 25);

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kenzie-chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-ppp-session-id": sessionId,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("Network error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let acc = "";
      let buffer = "";

      // stream tokens and patch last assistant message
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            if (trimmed === "data: [DONE]") continue;
            
            if (trimmed.startsWith("data: ")) {
              try {
                const jsonStr = trimmed.slice(6);
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  acc += content;
                  setMessages((prev) => {
                    const cp = [...prev];
                    const last = cp[cp.length - 1];
                    if (last?.role === "assistant") last.content = acc;
                    return cp;
                  });
                }
              } catch (e) {
                console.error("Failed to parse SSE chunk:", e);
              }
            }
          }
        }
      }

      // 3) persist the assistant final content
      await sb.from("kenzie_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: acc.trim() ? acc : "…",
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Sorry, I had trouble replying. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return open ? (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="absolute right-4 bottom-4 w-[min(500px,90vw)] h-[min(600px,70vh)] rounded-2xl bg-white/90 backdrop-blur text-black shadow-2xl border border-black/10 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between bg-white/70">
          <div className="font-semibold">Chat with Kenzie</div>
          <button
            onClick={() => setOpen(false)}
            className="size-9 rounded-full border border-black/10 bg-black/5 hover:bg-black/10 grid place-items-center"
            aria-label="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[90%] ${m.role === "user" ? "ml-auto" : ""}`}>
              <div className={`rounded-2xl px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-black text-white" : "bg-black/5 text-justify"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && <div className="text-sm text-black/60">Kenzie is typing…</div>}
        </div>

        <form onSubmit={send} className="p-3 border-t border-black/10 bg-white/70 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/20"
            placeholder="Ask about products, donations, orders…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={sending || !sb || !input.trim()} 
            className={`rounded-xl px-4 py-2 text-white disabled:opacity-60 transition-colors ${
              input.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black'
            }`}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  ) : null;
}

// ---- helpers ----
async function loadHistory(sb: SupabaseClient, limit = 25): Promise<Msg[]> {
  const { data, error } = await sb
    .from("kenzie_messages")
    .select("role, content, created_at")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r) => ({ role: r.role as Msg["role"], content: r.content }));
}
