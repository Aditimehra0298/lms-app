"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, X } from "lucide-react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";

type ChatLine = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "lms-chat-session-id";
const THREAD_KEY = "lms-openai-thread-id";

function getStoredThreadId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(THREAD_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeThreadId(id: string) {
  try {
    localStorage.setItem(THREAD_KEY, id);
  } catch {
    /* ignore */
  }
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "lms-ssr";
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `lms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `lms-${Date.now()}`;
  }
}

const WELCOME: ChatLine = {
  role: "assistant",
  content:
    "Hi! I'm your SF Trainings learning assistant. Ask about courses, enrollments, certificates, or how to use the LMS.",
};

function ChatLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const img =
    size === "sm" ? "h-6 w-auto" : size === "lg" ? "h-10 w-auto" : "h-8 w-auto";
  return (
    <Image
      src={sfWhiteLogo}
      alt=""
      aria-hidden
      className={`shrink-0 object-contain ${img}`}
      sizes={size === "lg" ? "40px" : size === "sm" ? "24px" : "32px"}
    />
  );
}

export default function LmsChatbot() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<"openai" | "n8n" | null>(null);
  const [threadId, setThreadId] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    setThreadId(getStoredThreadId());
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat", { cache: "no-store" });
        const data = (await res.json()) as {
          configured?: boolean;
          provider?: "openai" | "n8n" | null;
        };
        if (!cancelled) {
          setConfigured(Boolean(data.configured));
          setProvider(data.provider ?? null);
        }
      } catch {
        if (!cancelled) setConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setLines((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          pagePath: pathname,
          ...(threadId ? { threadId } : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        message?: string;
        threadId?: string;
      };
      if (data.threadId) {
        setThreadId(data.threadId);
        storeThreadId(data.threadId);
      }
      if (data.ok && data.reply) {
        setLines((prev) => [...prev, { role: "assistant", content: data.reply! }]);
      } else {
        setLines((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.message ??
              "Sorry, I could not get a reply. Check OPENAI_API_KEY in .env.local and restart npm run dev.",
          },
        ]);
      }
    } catch {
      setLines((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, pathname, sending, sessionId, threadId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div
          role="dialog"
          aria-label="Learning assistant chat"
          className="pointer-events-auto relative flex h-[min(520px,calc(100vh-6rem))] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-amber-200/25 shadow-[0_12px_48px_rgba(180,120,20,0.35)]"
        >
          {/* Bright golden base — smooth gradients only, no grid */}
          <div
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#4a3d28] via-[#5c4a32] to-[#3d3225]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-linear-to-t from-amber-900/30 via-transparent to-amber-100/20"
            aria-hidden
          />
          {/* Golden light rays */}
          <div
            className="pointer-events-none absolute -right-8 -top-12 h-44 w-56 rotate-12 rounded-full bg-amber-300/45 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-6 top-1/3 h-36 w-48 -rotate-6 rounded-full bg-yellow-200/35 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-40 rounded-full bg-orange-300/30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-linear-to-b from-amber-50/25 via-transparent to-amber-950/10"
            aria-hidden
          />
          <header className="relative flex items-center justify-between gap-2 border-b border-amber-200/20 bg-amber-50/10 px-4 py-3 backdrop-blur-[2px]">
            <div className="flex items-center gap-2">
              <ChatLogo />
              <div>
                <p className="text-sm font-semibold text-amber-50">AI Learning Assistant</p>
                <p className="text-[10px] text-amber-100/80">
                  {configured === false
                    ? "Setup needed — add OpenAI keys to .env.local"
                    : configured
                      ? provider === "openai"
                        ? "Online · OpenAI"
                        : "Online"
                      : "Connecting…"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-amber-100/90 hover:bg-amber-950/20 hover:text-white"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </header>

          <div ref={scrollRef} className="relative flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {lines.map((line, i) => (
              <div
                key={`${line.role}-${i}`}
                className={`flex gap-2 ${line.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {line.role === "assistant" ? <ChatLogo size="sm" /> : null}
                <p
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    line.role === "user"
                      ? "bg-amber-400/35 text-amber-950"
                      : "bg-amber-950/25 text-amber-50 backdrop-blur-[1px]"
                  }`}
                >
                  {line.content}
                </p>
              </div>
            ))}
            {sending ? (
              <p className="text-xs text-amber-200/70">Assistant is typing…</p>
            ) : null}
          </div>

          <footer className="relative border-t border-amber-200/20 bg-amber-50/10 p-3 backdrop-blur-[2px]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about courses, certificates…"
                disabled={sending}
                className="min-h-[44px] flex-1 resize-none rounded-2xl border border-amber-200/25 bg-amber-950/15 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/50 focus:border-amber-300/60 focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:bg-amber-300 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </footer>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto relative flex items-center justify-center bg-transparent p-0 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        aria-label={open ? "Close learning assistant" : "Open learning assistant"}
        aria-expanded={open}
      >
        {/* Soft golden glow behind logo — no box, no grid */}
        <span
          className="pointer-events-none absolute h-16 w-20 rounded-full bg-amber-400/40 blur-2xl"
          aria-hidden
        />
        {open ? (
          <X size={26} className="relative text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
        ) : (
          <Image
            src={sfWhiteLogo}
            alt="Open SF Trainings assistant"
            className="relative h-12 w-auto object-contain drop-shadow-[0_0_18px_rgba(251,191,36,0.55)]"
            sizes="48px"
            priority
          />
        )}
      </button>
    </div>
  );
}
