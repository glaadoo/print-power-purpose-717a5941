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
  content: "Hi, I’m Kenzie 🐾 How can I help with printing or donations today?",
};

// Helper to build a scoped supabase client with the session header
function makeScopedClient(sessionId: string): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return createClient(url, key, {
    global: {
      headers: { "x-ppp-session-id": sessionId },
    },
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
        const { data, error } = await singleton.from("kenzie_sessions").insert({}).select("id").single();
        if (error || !data) return;
        sid = data.id as string;
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

      const res = await fetch("/api/kenzie-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-ppp-session-id": sessionId },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("Network error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let acc = "";

      // stream tokens and patch last assistant message
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          acc += chunk;
          setMessages((prev) => {
            const cp = [...prev];
            const last = cp[cp.length - 1];
            if (last?.role === "assistant") last.content = acc;
            return cp;
          });
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
      <div className="absolute right-4 bottom-4 w-[min(680px,95vw)] h-[min(75vh,780px)] rounded-2xl bg-white/90 backdrop-blur text-black shadow-2xl border border-black/10 flex flex-col overflow-hidden">
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
              <div className={`rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-black text-white" : "bg-black/5"}`}>
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
          <button type="submit" disabled={sending || !sb} className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-60">
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
