"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Send, X } from "lucide-react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import { learnerDisplayFirstName, readLearnerProfileFromStorage } from "@/lib/auth-profile";
import {
  getLearnerEmail,
  isLearnerLoggedIn,
  syncLearnerProfileFromServer,
} from "@/lib/learner-session-client";

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

function buildWelcomeMessage(firstName: string, onDashboard: boolean): string {
  const hi = firstName === "there" ? "Hi!" : `Hi ${firstName}!`;
  if (onDashboard) {
    return `${hi} I'm your SF Trainings learning assistant. You're on your dashboard — ask about your courses, progress, certificates, or what to learn next.`;
  }
  return `${hi} I'm your SF Trainings learning assistant. Ask about courses, enrollments, certificates, or how to use the LMS.`;
}

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
  const searchParams = useSearchParams();
  const onDashboard =
    pathname === "/my-learning" && (searchParams.get("tab") ?? "overview") === "dashboard";
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<"openai" | "n8n" | null>(null);
  const [threadId, setThreadId] = useState("");
  const [learnerFirstName, setLearnerFirstName] = useState("there");
  const [lines, setLines] = useState<ChatLine[]>([
    { role: "assistant", content: buildWelcomeMessage("there", false) },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const hasUserMessagedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    setThreadId(getStoredThreadId());
  }, []);

  useEffect(() => {
    const applyProfile = () => {
      const profile = readLearnerProfileFromStorage();
      setLearnerFirstName(learnerDisplayFirstName(profile.name, profile.email));
    };
    applyProfile();
    const onAuth = () => applyProfile();
    window.addEventListener("sft_auth_updated", onAuth);
    if (isLearnerLoggedIn()) {
      const email = getLearnerEmail();
      if (email) void syncLearnerProfileFromServer(email).then((p) => {
        if (p) setLearnerFirstName(learnerDisplayFirstName(p.name, p.email));
      });
    }
    return () => window.removeEventListener("sft_auth_updated", onAuth);
  }, []);

  useEffect(() => {
    if (hasUserMessagedRef.current) return;
    setLines([{ role: "assistant", content: buildWelcomeMessage(learnerFirstName, onDashboard) }]);
  }, [learnerFirstName, onDashboard]);

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

    hasUserMessagedRef.current = true;
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
          className="pointer-events-auto relative flex h-[min(520px,calc(100vh-6rem))] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-zinc-800 shadow-[0_24px_64px_rgba(0,0,0,0.9)]"
          style={{ background: "#000" }}
        >
          {/* Header */}
          <header className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="flex items-center gap-2">
              <ChatLogo />
              <div>
                <p className="text-sm font-semibold text-white">
                  {learnerFirstName !== "there"
                    ? `${learnerFirstName}'s Learning Assistant`
                    : "AI Learning Assistant"}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {configured === false
                    ? "Setup needed — add OpenAI keys to .env.local"
                    : configured
                      ? provider === "openai"
                        ? "SFT Assistant"
                        : "Online"
                      : "Connecting…"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" style={{ background: "#000" }}>
            {lines.map((line, i) => (
              <div
                key={`${line.role}-${i}`}
                className={`flex gap-2 ${line.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {line.role === "assistant" ? <ChatLogo size="sm" /> : null}
                <p
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    line.role === "user"
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800"
                  }`}
                >
                  {line.content}
                </p>
              </div>
            ))}
            {sending ? (
              <p className="text-xs text-zinc-600">Assistant is typing…</p>
            ) : null}
          </div>

          {/* Footer */}
          <footer className="border-t border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about courses, certificates…"
                disabled={sending}
                className="min-h-[44px] flex-1 resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-zinc-200 disabled:opacity-40"
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
        className="pointer-events-auto relative flex items-center justify-center bg-transparent p-0 transition hover:scale-105 focus:outline-none"
        aria-label={open ? "Close learning assistant" : "Open learning assistant"}
        aria-expanded={open}
      >
        {open ? (
          <X size={26} className="relative text-white" />
        ) : (
          <Image
            src={sfWhiteLogo}
            alt="Open SF Trainings assistant"
            className="relative h-12 w-auto object-contain"
            sizes="48px"
            priority
          />
        )}
      </button>
    </div>
  );
}
