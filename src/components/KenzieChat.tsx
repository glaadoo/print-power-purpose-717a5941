// src/components/KenzieChat.tsx
import React, { useEffect, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase as singleton } from "@/integrations/supabase/client";

declare global {
  interface Window {
    kenzieOpenChat?: () => void;
  }
}

type Msg = { role: "user" | "assistant"; content: string; buttons?: { label: string; action: string }[] };
type FlowState = "initial" | "awaiting_option" | "awaiting_email_orders" | "awaiting_email_status" | "showing_results";

const STARTER_MESSAGES: Msg[] = [
  {
    role: "assistant",
    content: `Woof! I'm Kenzie 🐾 How can I help you today?`,
    buttons: [
      { label: "Products", action: "products" },
      { label: "Causes", action: "causes" },
      { label: "Print Info", action: "print_info" },
      { label: "Order Details", action: "check_orders" },
      { label: "Order Status", action: "order_status" },
      { label: "Our Mission", action: "mission" }
    ]
  }
];

// Helper to build a scoped supabase client with the session header
function makeScopedClient(sessionId: string): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL || "https://wgohndthjgeqamfuldov.supabase.co";
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2huZHRoamdlcWFtZnVsZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDQ1MTYsImV4cCI6MjA3NDc4MDUxNn0.cb9tO9fH93WRlLclJwhhmY03Hck9iyZF6GYXjbYjibw";

  return createClient(url, key, {
    global: {
      headers: { "x-ppp-session-id": sessionId },
    },
    auth: { persistSession: false },
  });
}

export default function KenzieChat() {
  const [open, setOpen] = useState(false);
  const [showPawIntro, setShowPawIntro] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sb, setSb] = useState<SupabaseClient | null>(null);
  const [flowState, setFlowState] = useState<FlowState>("initial");
  const [userEmail, setUserEmail] = useState<string>("");
  const [conversationEnded, setConversationEnded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStartOver = () => {
    setMessages(STARTER_MESSAGES);
    setFlowState("initial");
    setUserEmail("");
    setConversationEnded(false);
  };

  // Show paw intro on first open
  useEffect(() => {
    if (open && !localStorage.getItem("ppp:kenzie:intro_shown")) {
      setShowPawIntro(true);
      setTimeout(() => {
        setShowPawIntro(false);
        localStorage.setItem("ppp:kenzie:intro_shown", "true");
      }, 3000); // Show paw animation for 3 seconds
    }
  }, [open]);

  // Display greeting messages with 1-second delay when chat opens (only for new sessions)
  useEffect(() => {
    if (open && messages.length === 0 && sessionId) {
      // Check if this is a new session by seeing if there are any messages in the database
      const checkAndSetGreeting = async () => {
        if (!sb) return;
        const { data } = await sb
          .from("kenzie_messages")
          .select("id")
          .eq("session_id", sessionId)
          .limit(1);
        
        // Only show greeting if no messages exist in database
        if (!data || data.length === 0) {
          setMessages(STARTER_MESSAGES);
        }
      };
      
      const timer = setTimeout(() => {
        checkAndSetGreeting();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [open, messages.length, sessionId, sb]);

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
      try {
        // 1) read from local storage or create
        let sid = localStorage.getItem("ppp:kenzie:session_id");
        if (!sid) {
          // Generate UUID first, then try to create session with it
          sid = crypto.randomUUID();
          localStorage.setItem("ppp:kenzie:session_id", sid);
          
          // Add to session history
          const history = JSON.parse(localStorage.getItem("ppp:kenzie:session_history") || "[]");
          if (!history.includes(sid)) {
            history.unshift(sid);
            localStorage.setItem("ppp:kenzie:session_history", JSON.stringify(history.slice(0, 20)));
          }
          
          // Try to create session in DB with the generated ID
          try {
            const scopedForInsert = makeScopedClient(sid);
            await scopedForInsert
              .from("kenzie_sessions")
              .insert({ id: sid })
              .select("id")
              .maybeSingle();
          } catch (dbErr) {
            console.warn("Could not create session in DB, using local ID only:", dbErr);
            // Continue anyway - we have a local session ID
          }
        }
        setSessionId(sid);

        // 2) build a scoped client with the header for all subsequent queries
        const scoped = makeScopedClient(sid);
        setSb(scoped);

        // 3) load last 40 messages (if any)
        try {
          const { data: msgs, error } = await scoped
            .from("kenzie_messages")
            .select("role, content, created_at")
            .order("created_at", { ascending: true })
            .limit(40);

          if (!error && msgs && msgs.length) {
            const m = msgs.map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
            setMessages(m);
          }
          // Messages will be set by the greeting delay useEffect if empty
        } catch (loadErr) {
          console.warn("Could not load message history:", loadErr);
          // Continue anyway - we'll just start with the starter message
        }
      } catch (err) {
        console.error("KenzieChat initialization error:", err);
        // Generate a fallback session ID so chat still works
        const fallbackSid = crypto.randomUUID();
        localStorage.setItem("ppp:kenzie:session_id", fallbackSid);
        setSessionId(fallbackSid);
        setSb(makeScopedClient(fallbackSid));
      }
    })();
  }, []);

  // autoscroll
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages, open]);

  async function handleEndConversation() {
    if (!sessionId || !sb) return;
    
    // Clear all messages from database
    try {
      await sb.from("kenzie_messages").delete().eq("session_id", sessionId);
    } catch (err) {
      console.warn("Could not clear messages:", err);
    }
    
    // Clear local storage session
    localStorage.removeItem("ppp:kenzie:session_id");
    
    // Show final goodbye message
    setMessages([{
      role: "assistant",
      content: "Conversation ended. Feel free to reach out anytime! 🐾"
    }]);
    
    // Mark conversation as ended
    setConversationEnded(true);
    setFlowState("initial");
  }

  async function handleStartNewConversation() {
    try {
      // Generate new session ID
      const newSid = crypto.randomUUID();
      localStorage.setItem("ppp:kenzie:session_id", newSid);
      
      // Add to session history
      const history = JSON.parse(localStorage.getItem("ppp:kenzie:session_history") || "[]");
      if (!history.includes(newSid)) {
        history.unshift(newSid);
        localStorage.setItem("ppp:kenzie:session_history", JSON.stringify(history.slice(0, 20)));
      }
      
      // Create new session in database
      try {
        const scopedForInsert = makeScopedClient(newSid);
        await scopedForInsert
          .from("kenzie_sessions")
          .insert({ id: newSid })
          .select("id")
          .maybeSingle();
        
        // Update the scoped client
        const newScoped = makeScopedClient(newSid);
        setSb(newScoped);
      } catch (dbErr) {
        console.warn("Could not create new session in DB, using local ID only:", dbErr);
        // Continue anyway - we have a local session ID
        setSb(makeScopedClient(newSid));
      }
      
      // Reset to initial state with greeting
      setSessionId(newSid);
      setMessages(STARTER_MESSAGES);
      setConversationEnded(false);
      setFlowState("initial");
      setUserEmail("");
      setInput("");
    } catch (err) {
      console.error("Error starting new conversation:", err);
      // Fallback: just reset the UI
      const fallbackSid = crypto.randomUUID();
      localStorage.setItem("ppp:kenzie:session_id", fallbackSid);
      setSessionId(fallbackSid);
      setSb(makeScopedClient(fallbackSid));
      setMessages(STARTER_MESSAGES);
      setConversationEnded(false);
      setFlowState("initial");
    }
  }

  async function handleButtonClick(action: string) {
    if (!sessionId || !sb) return;
    
    if (action === "products") {
      const msg = "We offer custom printing on a variety of products! Visit our Products page to browse items like t-shirts, hoodies, mugs, tote bags, and more. Each purchase supports a cause of your choice! 🎨";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Check products that we offer" },
        { role: "assistant", content: msg },
      ]);
      await sb.from("kenzie_messages").insert([
        { session_id: sessionId, role: "user", content: "Check products that we offer" },
        { session_id: sessionId, role: "assistant", content: msg }
      ]);
      setFlowState("initial");
    } else if (action === "causes") {
      const msg = "Print Power Purpose partners with nonprofits and schools to give back to communities! Visit our Causes page to see our current partners and learn how each purchase makes a difference. You can select your preferred cause during checkout! 💙";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "List of causes" },
        { role: "assistant", content: msg },
      ]);
      await sb.from("kenzie_messages").insert([
        { session_id: sessionId, role: "user", content: "List of causes" },
        { session_id: sessionId, role: "assistant", content: msg }
      ]);
      setFlowState("initial");
    } else if (action === "print_info") {
      const msg = "We can print on almost anything! From apparel like t-shirts and hoodies, to accessories like mugs, phone cases, and tote bags. We also offer banners, stickers, and custom promotional items. Have something specific in mind? Just ask! 🖨️";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "What can you print for" },
        { role: "assistant", content: msg },
      ]);
      await sb.from("kenzie_messages").insert([
        { session_id: sessionId, role: "user", content: "What can you print for" },
        { session_id: sessionId, role: "assistant", content: msg }
      ]);
      setFlowState("initial");
    } else if (action === "check_orders") {
      const msg = "Great! Please enter the registered email ID you used while placing the order.";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Check order details" },
        { role: "assistant", content: msg },
      ]);
      await sb.from("kenzie_messages").insert([
        { session_id: sessionId, role: "user", content: "Check order details" },
        { session_id: sessionId, role: "assistant", content: msg }
      ]);
      setFlowState("awaiting_email_orders");
    } else if (action === "order_status") {
      const msg = "Sure! Please enter the registered email ID you used while placing the order.";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Order status" },
        { role: "assistant", content: msg },
      ]);
      await sb.from("kenzie_messages").insert([
        { session_id: sessionId, role: "user", content: "Order status" },
        { session_id: sessionId, role: "assistant", content: msg }
      ]);
      setFlowState("awaiting_email_status");
    } else if (action === "mission") {
      const msg = "At Print Power Purpose, we believe every purchase should make a difference! Our mission is to combine quality custom printing with meaningful giving. Every item you order directly supports nonprofits and schools in need. Learn more about our impact and mission on our Personal Mission page! 🎯💙";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Tell me about your mission" },
        { role: "assistant", content: msg },
      ]);
      await sb.from("kenzie_messages").insert([
        { session_id: sessionId, role: "user", content: "Tell me about your mission" },
        { session_id: sessionId, role: "assistant", content: msg }
      ]);
      setFlowState("initial");
    } else if (action === "retry_email") {
      const msg = "No problem! Please enter a different email address to search for orders.";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Try another email" },
        { role: "assistant", content: msg },
      ]);
      await sb.from("kenzie_messages").insert([
        { session_id: sessionId, role: "user", content: "Try another email" },
        { session_id: sessionId, role: "assistant", content: msg }
      ]);
      // Keep the same flow state based on what the user was originally trying to do
      const previousFlow = flowState === "showing_results" ? "awaiting_email_orders" : flowState;
      setFlowState(previousFlow === "initial" ? "awaiting_email_orders" : previousFlow);
    }
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!sessionId || !sb || sending || conversationEnded) return;

    const text = input.trim();
    if (!text) return;

    setInput("");
    setSending(true);

    // Check if this is the first user message and generate title
    const { data: existingMessages } = await sb
      .from("kenzie_messages")
      .select("id")
      .eq("session_id", sessionId)
      .eq("role", "user")
      .limit(1);

    const isFirstUserMessage = !existingMessages || existingMessages.length === 0;

    // 1) write user message to DB
    await sb.from("kenzie_messages").insert({
      session_id: sessionId,
      role: "user",
      content: text,
    });

    // Generate and save title from first user message
    if (isFirstUserMessage) {
      const title = text.length > 50 ? text.substring(0, 50) + "..." : text;
      await sb
        .from("kenzie_sessions")
        .update({ title })
        .eq("id", sessionId);
    }

    // Quick path: instant greeting for short salutations
    const lower = text.toLowerCase();
    const isGreet = /^(hi|hello|hey|hiya|howdy|yo|sup|good (morning|afternoon|evening))\b/.test(lower);
    if (isGreet) {
      const quick = "Hi there! I'm Kenzie 🐾 — how can I help today?\n\nWhat should I help you with?";
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
          { 
          role: "assistant", 
          content: quick,
          buttons: [
            { label: "Products", action: "products" },
            { label: "Causes", action: "causes" },
            { label: "Print Info", action: "print_info" },
            { label: "Order Details", action: "check_orders" },
            { label: "Order Status", action: "order_status" },
            { label: "Our Mission", action: "mission" }
          ]
        },
      ]);
      await sb.from("kenzie_messages").insert({ session_id: sessionId, role: "assistant", content: quick });
      setSending(false);
      setFlowState("awaiting_option");
      return;
    }

    // Handle flow-based responses
    if (flowState === "awaiting_email_orders" || flowState === "awaiting_email_status") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(text)) {
        const errorMsg = "Please provide a valid email address.";
        setMessages((prev) => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: errorMsg },
        ]);
        await sb.from("kenzie_messages").insert({ session_id: sessionId, role: "assistant", content: errorMsg });
        setSending(false);
        return;
      }

      setUserEmail(text);
      setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);

      try {
        // Call edge function to fetch orders (requires service role access)
        const { data: ordersData, error: ordersError } = await sb.functions.invoke("kenzie-chat", {
          body: { action: "fetch_orders", email: text }
        });

        if (ordersError) throw ordersError;
        const orders = ordersData?.orders || [];

        if (!orders || orders.length === 0) {
          const noOrdersMsg = `I couldn't find any orders associated with ${text}. Please double-check the email address or contact support if you need assistance.`;
          setMessages((prev) => {
            const cp = [...prev];
            cp[cp.length - 1] = { 
              role: "assistant", 
              content: noOrdersMsg,
              buttons: [
                { label: "Try Another Email", action: "retry_email" }
              ]
            };
            return cp;
          });
          await sb.from("kenzie_messages").insert({ session_id: sessionId, role: "assistant", content: noOrdersMsg });
          setFlowState("showing_results");
        } else {
          let responseMsg = "";
          if (flowState === "awaiting_email_orders") {
            responseMsg = `Found ${orders.length} order${orders.length > 1 ? 's' : ''} for ${text}:\n\n`;
            orders.forEach((order, idx) => {
              responseMsg += `**Order ${idx + 1}:**\n`;
              responseMsg += `• Order Number: ${order.order_number}\n`;
              responseMsg += `• Product: ${order.product_name || 'N/A'}\n`;
              responseMsg += `• Amount: $${(order.amount_total_cents / 100).toFixed(2)}\n`;
              responseMsg += `• Donation: $${((order.donation_cents || 0) / 100).toFixed(2)}\n`;
              responseMsg += `• Date: ${new Date(order.created_at).toLocaleDateString()}\n`;
              responseMsg += `• Status: ${order.status}\n\n`;
            });
          } else {
            responseMsg = `Order Status for ${text}:\n\n`;
            orders.forEach((order, idx) => {
              responseMsg += `**Order ${idx + 1}:**\n`;
              responseMsg += `• Order Number: ${order.order_number}\n`;
              responseMsg += `• Status: ${order.status}\n`;
              responseMsg += `• Last Updated: ${new Date(order.created_at).toLocaleDateString()}\n\n`;
            });
          }
          responseMsg += "Is there anything else I can help you with?";
          
          setMessages((prev) => {
            const cp = [...prev];
            cp[cp.length - 1] = { role: "assistant", content: responseMsg };
            return cp;
          });
          await sb.from("kenzie_messages").insert({ session_id: sessionId, role: "assistant", content: responseMsg });
          setFlowState("initial");
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        const errorMsg = "Sorry, I had trouble fetching your order information. Could you try again or choose from these options?";
        setMessages((prev) => {
          const cp = [...prev];
          cp[cp.length - 1] = { 
            role: "assistant", 
            content: errorMsg,
            buttons: [
              { label: "Products", action: "products" },
              { label: "Causes", action: "causes" },
              { label: "Print Info", action: "print_info" },
              { label: "Order Details", action: "check_orders" },
              { label: "Order Status", action: "order_status" },
              { label: "Our Mission", action: "mission" }
            ]
          };
          return cp;
        });
        await sb.from("kenzie_messages").insert({ session_id: sessionId, role: "assistant", content: errorMsg });
        setFlowState("initial");
      }
      
      setSending(false);
      return;
    }

    // 2) show locally (optimistic)
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);

    // Set a timeout to prevent infinite "thinking" state
    const timeoutId = setTimeout(() => {
      setSending(false);
      setMessages((prev) => {
        const cp = [...prev];
        const last = cp[cp.length - 1];
        if (last?.role === "assistant" && !last.content) {
          last.content = "I'm having trouble responding right now. Could you please try rephrasing your question or select from one of these options?";
          last.buttons = [
            { label: "Check products that we offer", action: "products" },
            { label: "List of causes", action: "causes" },
            { label: "What can you print for", action: "print_info" },
            { label: "Check order details", action: "check_orders" },
            { label: "Check order status", action: "order_status" },
            { label: "Our Mission", action: "mission" }
          ];
        }
        return cp;
      });
      setFlowState("awaiting_option");
    }, 30000); // 30 second timeout

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
        body: JSON.stringify({ messages: history.filter(m => !STARTER_MESSAGES.some(s => s.content === m.content)) }),
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

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      // If no response was received, show fallback with options
      if (!acc.trim()) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "I'm not quite sure what you're asking for. Could you please rephrase that or choose one of the options I can help with?",
            buttons: [
              { label: "Products", action: "products" },
              { label: "Causes", action: "causes" },
              { label: "Print Info", action: "print_info" },
              { label: "Order Details", action: "check_orders" },
              { label: "Order Status", action: "order_status" },
              { label: "Our Mission", action: "mission" }
            ]
          };
          return updated;
        });
        setFlowState("awaiting_option");
        return;
      }

      // 3) persist the assistant final content
      await sb.from("kenzie_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: acc.trim(),
      });

      // Check if AI returned show options signal
      if (acc.includes("SHOW_OPTIONS")) {
        setMessages(prev => {
          const updated = [...prev];
          const currentContent = updated[updated.length - 1].content;
          // Remove the SHOW_OPTIONS marker and keep the helpful message
          const cleanContent = currentContent.replace("SHOW_OPTIONS", "").trim();
          updated[updated.length - 1] = {
            role: "assistant",
            content: cleanContent || "I'm not quite sure what you're asking for. Could you please rephrase that or choose one of the options I can help with?",
            buttons: [
              { label: "Products", action: "products" },
              { label: "Causes", action: "causes" },
              { label: "Print Info", action: "print_info" },
              { label: "Order Details", action: "check_orders" },
              { label: "Order Status", action: "order_status" },
              { label: "Our Mission", action: "mission" }
            ]
          };
          return updated;
        });
        setFlowState("awaiting_option");
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const cp = [...prev];
        const last = cp[cp.length - 1];
        if (last?.role === "assistant") {
          last.content = "Sorry, I had trouble replying. Could you rephrase your question or choose from these options?";
          last.buttons = [
            { label: "Products", action: "products" },
            { label: "Causes", action: "causes" },
            { label: "Print Info", action: "print_info" },
            { label: "Order Details", action: "check_orders" },
            { label: "Order Status", action: "order_status" },
            { label: "Our Mission", action: "mission" }
          ];
        }
        return cp;
      });
      setFlowState("awaiting_option");
    } finally {
      setSending(false);
    }
  }

  return open ? (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      
      {/* Paw intro animation overlay */}
      {showPawIntro && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm z-10 animate-fade-in">
          <div className="text-center space-y-6">
            <div className="text-8xl animate-bounce">
              🐾
            </div>
            <div className="text-2xl font-bold text-primary animate-scale-in">
              Woof! Kenzie here!
            </div>
            <div className="text-lg text-muted-foreground animate-fade-in">
              Ready to help with your printing needs...
            </div>
            <div className="paws-row">
              🐾 🐾 🐾 🐾 🐾
            </div>
          </div>
        </div>
      )}

      <div className="absolute right-4 bottom-4 w-[min(500px,90vw)] h-[min(600px,70vh)] rounded-2xl bg-white/90 backdrop-blur text-black shadow-2xl border border-black/10 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between bg-white/70">
          <div className="font-semibold">Chat with Kenzie 🐾</div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartOver}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/5 hover:bg-black/10 transition-colors"
            >
              Start Over
            </button>
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
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div 
              key={i} 
              className={`max-w-[90%] animate-fade-in ${m.role === "user" ? "ml-auto" : ""}`}
            >
              <div className={`rounded-2xl px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-black text-white" : "bg-black/5 text-justify"}`}>
                {m.content || (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm text-black/60">Kenzie is thinking...</span>
                  </div>
                )}
              </div>
              {m.buttons && m.buttons.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {m.buttons.map((btn, btnIdx) => (
                    <button
                      key={btnIdx}
                      onClick={() => handleButtonClick(btn.action)}
                      disabled={sending}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-center text-sm font-medium"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={send} className="p-3 border-t border-black/10 bg-white/70 flex flex-col gap-2">
          {conversationEnded ? (
            <button
              type="button"
              onClick={handleStartNewConversation}
              className="w-full rounded-xl px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 transition-all transform active:scale-95 font-medium"
            >
              Start Conversation Again
            </button>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 disabled:bg-black/5 disabled:cursor-not-allowed transition-all"
                  placeholder={sending ? "Kenzie is responding..." : "Ask about products, donations, orders…"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending || !sb}
                  autoFocus
                />
                <button 
                  type="submit" 
                  disabled={sending || !sb || !input.trim()} 
                  className={`rounded-xl px-4 py-2 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-95 ${
                    sending ? 'bg-gray-500' : input.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black/60'
                  }`}
                >
                  {sending ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Sending</span>
                    </div>
                  ) : (
                    <span>Send</span>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={handleEndConversation}
                disabled={sending}
                className="w-full rounded-xl px-4 py-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                End Conversation
              </button>
            </>
          )}
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
