                       "use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageCircle, RotateCcw, Send, Sparkles, X } from "lucide-react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import { learnerDisplayFullName, readLearnerProfileFromStorage } from "@/lib/auth-profile";
import {
  getLearnerEmail,
  isLearnerLoggedIn,
  syncLearnerProfileFromServer,
} from "@/lib/learner-session-client";

type ChatLine = { role: "user" | "assistant"; content: string };

const CHATBOT_NAME = "Sustainable Futures Trainings Assistant";
const CHATBOT_FULL_NAME = "Sustainable Futures Trainings Assistant";
const THREAD_KEY = "lms-openai-thread-id";
const SESSION_KEY = "lms-chat-session-id";
const GUEST_CONTACT_KEY = "lms-chat-guest-contact";

type GuestContact = {
  name: string;
  email: string;
  phone: string;
};

function readGuestContact(): GuestContact | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GUEST_CONTACT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestContact;
    if (parsed?.name?.trim() && parsed?.email?.trim() && parsed?.phone?.trim()) {
      return {
        name: parsed.name.trim(),
        email: parsed.email.trim().toLowerCase(),
        phone: parsed.phone.trim(),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveGuestContact(contact: GuestContact) {
  try {
    sessionStorage.setItem(GUEST_CONTACT_KEY, JSON.stringify(contact));
  } catch {
    /* ignore */
  }
}

function clearGuestContact() {
  try {
    sessionStorage.removeItem(GUEST_CONTACT_KEY);
  } catch {
    /* ignore */
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

const QUICK_PROMPTS = [
  { label: "Find a course", text: "I'm looking for a course — what do you recommend?" },
  { label: "My certificates", text: "How do I get to my certificates?" },
  { label: "Video not playing", text: "A lesson video won't play — any ideas?" },
  { label: "Can't sign in", text: "I'm having trouble signing in" },
  { label: "My progress", text: "Where can I see how far I've got in my course?" },
] as const;

const LOGGED_IN_QUICK_PROMPTS = [
  { label: "My courses", text: "What courses am I enrolled in?" },
  { label: "My certificates", text: "Show my certificates" },
  { label: "Payment issue", text: "I have a payment problem" },
] as const;

function looksLikePaymentChat(text: string): boolean {
  return /\b(payment|paid|razorpay|refund|charged|transaction|invoice|checkout|student id|transaction id|payment date)\b/i.test(
    text,
  );
}

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

function clearStoredThreadId() {
  try {
    localStorage.removeItem(THREAD_KEY);
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

type GuestStep = "idle" | "name" | "email" | "phone" | "done";

const GUEST_PENDING_KEY = "lms-chat-guest-pending-question";

function saveGuestPendingQuestion(text: string) {
  try {
    sessionStorage.setItem(GUEST_PENDING_KEY, text);
  } catch {
    /* ignore */
  }
}

function takeGuestPendingQuestion(): string {
  try {
    const q = sessionStorage.getItem(GUEST_PENDING_KEY)?.trim() || "";
    if (q) sessionStorage.removeItem(GUEST_PENDING_KEY);
    return q;
  } catch {
    return "";
  }
}

function buildWelcomeMessage(displayName: string, onDashboard: boolean, loggedIn: boolean): string {
  if (!loggedIn) {
    return `Hey! I'm Sustainable Futures Trainings Assistant.\n\nTell me what you need — course info, help with learning, a payment or technical issue, certificates, or anything else.\n\nWhat can I help you with today?`;
  }
  const hi = displayName === "there" ? "Hey!" : `Hey ${displayName}!`;
  if (onDashboard) {
    return `${hi} Need help with a course, your progress, or a certificate?\n\nJust ask — I'll look up what's on your account.`;
  }
  return `${hi} I'm your training assistant.\n\nAsk about courses, your enrollments, certificates, or payments — I'll use your live account data.`;
}

function buildGuestReadyMessage(name: string): string {
  return `Thanks, ${name}! I've got your details. One moment…`;
}

function cleanAssistantText(text: string): string {
  return text.replace(/【[^】]*】/g, "").trim();
}

const URL_IN_TEXT =
  /(https?:\/\/[^\s]+|\/(?:courses|my-learning|account|login|contact)(?:\/[^\s]*)?(?:\?[^\s]*)?)/g;

const PENDING_CHAT_KEY = "lms-chat-pending-question";

function savePendingChatQuestion(text: string) {
  try {
    sessionStorage.setItem(PENDING_CHAT_KEY, text);
  } catch {
    /* ignore */
  }
}

function takePendingChatQuestion(): string {
  try {
    const q = sessionStorage.getItem(PENDING_CHAT_KEY)?.trim() || "";
    if (q) sessionStorage.removeItem(PENDING_CHAT_KEY);
    return q;
  } catch {
    return "";
  }
}

function replyAsksForLogin(text: string): boolean {
  return /sign in first|please sign in|login:|\/account\?mode=login/i.test(text);
}

function looksLikeSpecificCourseTopic(text: string): boolean {
  const q = text.toLowerCase();
  return /\b(cyber|esg|food|hvac|phishing|medical|workplace|skill development|iso\s*27001|haccp|infosec|information security)\b/.test(
    q,
  );
}

function looksLikeGeneralCourseInfoQuestion(text: string): boolean {
  const q = text.toLowerCase();
  if (looksLikeSpecificCourseTopic(q)) return false;
  return /course information|your courses|give me .*course|tell me .*course|what courses|which courses|show .*courses|catalog|lms course|training you offer|courses? (you|u) (have|offer)|can u give|can you give/.test(
    q,
  );
}

function looksLikeCourseInfoQuestion(text: string): boolean {
  // Specific topic (e.g. cyber) → answer from catalog first.
  // General "course information" → collect name/email/phone first, then categories.
  if (looksLikeGeneralCourseInfoQuestion(text)) return false;
  const q = text.toLowerCase();
  if (/payment|refund|ticket|password|login problem|can't sign/.test(q)) return false;
  return looksLikeSpecificCourseTopic(q) || /course|training|program|catalog|price|duration|tell me about|details/.test(q);
}

function ChatMessageContent({ text, isUser }: { text: string; isUser: boolean }) {
  const parts = text.split(/\n\n+/);

  return (
    <div className="space-y-2">
      {parts.map((paragraph, pi) => {
        const segments: React.ReactNode[] = [];
        let last = 0;
        let match: RegExpExecArray | null;
        const re = new RegExp(URL_IN_TEXT.source, "g");
        while ((match = re.exec(paragraph)) !== null) {
          if (match.index > last) {
            segments.push(paragraph.slice(last, match.index));
          }
          const href = match[0];
          const label = href.startsWith("http")
            ? href.replace(/^https?:\/\/[^/]+/, "") || href
            : href;
          segments.push(
            <Link
              key={`${pi}-${match.index}`}
              href={href.startsWith("/") ? href : href}
              className={
                isUser
                  ? "font-medium underline decoration-black/30 underline-offset-2"
                  : "font-medium text-amber-300 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-200"
              }
              {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {label}
            </Link>,
          );
          last = match.index + match[0].length;
        }
        if (last < paragraph.length) segments.push(paragraph.slice(last));

        return (
          <p key={pi} className="leading-relaxed">
            {segments.length ? segments : paragraph}
          </p>
        );
      })}
    </div>
  );
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

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <ChatLogo size="sm" />
      <span className="flex items-center gap-1 rounded-2xl bg-zinc-900 px-3 py-2 ring-1 ring-zinc-800">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:300ms]" />
      </span>
    </div>
  );
}

export default function LmsChatbot() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const onDashboard =
    pathname === "/my-learning" && (searchParams.get("tab") ?? "overview") === "dashboard";
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<"openai" | "n8n" | "local" | null>(null);
  const [categories, setCategories] = useState<Array<{ slug: string; label: string; count: number; prompt: string }>>([]);
  const [threadId, setThreadId] = useState("");
  const [learnerDisplayName, setLearnerDisplayName] = useState("there");
  const [loggedIn, setLoggedIn] = useState(false);
  const [guestContact, setGuestContact] = useState<GuestContact | null>(null);
  const [guestStep, setGuestStep] = useState<GuestStep>("idle");
  const [guestDraft, setGuestDraft] = useState({ name: "", email: "", phone: "" });
  const [lines, setLines] = useState<ChatLine[]>([
    { role: "assistant", content: buildWelcomeMessage("there", false, false) },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const hasUserMessagedRef = useRef(false);
  const pendingResumeRef = useRef(false);
  const wasLoggedInRef = useRef(false);
  const sendMessageRef = useRef<
    ((text: string, options?: { skipUserBubble?: boolean }) => Promise<void>) | null
  >(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const welcomeLine = useCallback(() => {
    return buildWelcomeMessage(learnerDisplayName, onDashboard, loggedIn);
  }, [learnerDisplayName, onDashboard, loggedIn]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    setThreadId(getStoredThreadId());
    const guest = readGuestContact();
    setGuestContact(guest);
    if (guest) {
      setGuestStep("done");
      setGuestDraft(guest);
      setLearnerDisplayName(guest.name);
    } else {
      setGuestStep("idle");
    }
  }, []);

  useEffect(() => {
    const onOpenChat = () => setOpen(true);
    window.addEventListener("lms-open-chat", onOpenChat);
    return () => window.removeEventListener("lms-open-chat", onOpenChat);
  }, []);

  useEffect(() => {
    const applyProfile = async () => {
      const nowLoggedIn = isLearnerLoggedIn();
      const email = getLearnerEmail()?.trim().toLowerCase() ?? "";
      let profile = readLearnerProfileFromStorage();

      if (email && nowLoggedIn) {
        const fromDb = await syncLearnerProfileFromServer(email);
        if (fromDb) profile = fromDb;
      }

      setLoggedIn(nowLoggedIn);
      if (nowLoggedIn) {
        clearGuestContact();
        setGuestContact(null);
        setLearnerDisplayName(learnerDisplayFullName(profile.name, profile.email ?? email));
      } else {
        const guest = readGuestContact();
        setGuestContact(guest);
        if (guest) {
          setGuestStep("done");
          setGuestDraft(guest);
          setLearnerDisplayName(guest.name);
        } else {
          setGuestStep("idle");
          setLearnerDisplayName("there");
        }
      }

      const justLoggedIn = !wasLoggedInRef.current && nowLoggedIn;
      wasLoggedInRef.current = nowLoggedIn;

      if (justLoggedIn) {
        const pending = takePendingChatQuestion();
        if (pending && !pendingResumeRef.current) {
          pendingResumeRef.current = true;
          setOpen(true);
          const fullName = learnerDisplayFullName(profile.name, email);
          setLines((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `You're signed in now${fullName !== "there" ? `, ${fullName}` : ""}. Pulling your real account details…`,
            },
          ]);
          window.setTimeout(() => {
            void sendMessageRef.current?.(pending);
            pendingResumeRef.current = false;
          }, 450);
        }
      }
    };

    void applyProfile();
    const onAuth = () => {
      void applyProfile();
    };
    window.addEventListener("sft_auth_updated", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener("sft_auth_updated", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  useEffect(() => {
    if (hasUserMessagedRef.current) return;
    setLines([{ role: "assistant", content: welcomeLine() }]);
  }, [welcomeLine]);

  const handleGuestIntakeTurn = useCallback(
    (raw: string): boolean => {
      if (loggedIn || guestContact) return false;
      const answer = raw.trim();
      if (!answer) return true;

      // First message: course/catalog questions get answered from API first.
      // Help/issue questions collect name → email → phone first.
      if (guestStep === "idle") {
        if (looksLikeCourseInfoQuestion(answer)) {
          return false;
        }
        hasUserMessagedRef.current = true;
        saveGuestPendingQuestion(answer);
        setLines((prev) => [...prev, { role: "user", content: answer }]);
        setGuestStep("name");
        setLines((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Happy to help with that.\n\nBefore I continue, may I have your full name?",
          },
        ]);
        return true;
      }

      if (guestStep !== "name" && guestStep !== "email" && guestStep !== "phone") {
        return false;
      }

      hasUserMessagedRef.current = true;
      setLines((prev) => [...prev, { role: "user", content: answer }]);

      if (guestStep === "name") {
        const name = answer.replace(/^(my name is|i am|i'm|this is)\s+/i, "").trim();
        if (name.length < 2) {
          setLines((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Please type your full name (for example: Priya Sharma).",
            },
          ]);
          return true;
        }
        setGuestDraft((prev) => ({ ...prev, name }));
        setLearnerDisplayName(name);
        setGuestStep("email");
        setLines((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Nice to meet you, ${name}.\n\nWhat's your Gmail / email address?`,
          },
        ]);
        return true;
      }

      if (guestStep === "email") {
        const email = answer
          .replace(/^(email|gmail|my email is|mail)\s*[:=]?\s*/i, "")
          .trim()
          .toLowerCase();
        if (!isValidEmail(email)) {
          setLines((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "That doesn't look like a valid email. Please share your Gmail / email (example: name@gmail.com).",
            },
          ]);
          return true;
        }
        setGuestDraft((prev) => ({ ...prev, email }));
        setGuestStep("phone");
        setLines((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Got it.\n\nWhat's your phone number?",
          },
        ]);
        return true;
      }

      if (guestStep === "phone") {
        const phone = answer
          .replace(/^(phone|mobile|number|my number is)\s*[:=]?\s*/i, "")
          .trim();
        if (!isValidPhone(phone)) {
          setLines((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Please enter a valid phone number (8–15 digits).",
            },
          ]);
          return true;
        }
        const contact: GuestContact = {
          name: guestDraft.name,
          email: guestDraft.email,
          phone,
        };
        saveGuestContact(contact);
        setGuestContact(contact);
        setGuestDraft(contact);
        setGuestStep("done");
        setLearnerDisplayName(contact.name);
        setLines((prev) => [
          ...prev,
          { role: "assistant", content: buildGuestReadyMessage(contact.name) },
        ]);

        const pending = takeGuestPendingQuestion();
        if (pending) {
          window.setTimeout(() => {
            void sendMessageRef.current?.(pending, { skipUserBubble: true });
          }, 350);
        }
        return true;
      }

      return false;
    },
    [loggedIn, guestContact, guestStep, guestDraft.name, guestDraft.email],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat", { cache: "no-store" });
        const data = (await res.json()) as {
          configured?: boolean;
          provider?: "openai" | "n8n" | "local" | null;
          categories?: Array<{ slug: string; label: string; count: number; prompt: string }>;
        };
        if (!cancelled) {
          setConfigured(Boolean(data.configured));
          setProvider(data.provider ?? null);
          setCategories(data.categories ?? []);
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

  const sendMessage = useCallback(
    async (text: string, options?: { skipUserBubble?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      if (!loggedIn && !guestContact && guestStep !== "done") {
        handleGuestIntakeTurn(trimmed);
        return;
      }

      hasUserMessagedRef.current = true;
      const priorHistory = lines
        .filter((line) => line.role === "user" || line.role === "assistant")
        .slice(-8)
        .map((line) => ({ role: line.role, content: line.content }));

      if (!options?.skipUserBubble) {
        setLines((prev) => [...prev, { role: "user", content: trimmed }]);
      }
      setSending(true);

      const started = Date.now();

      try {
        const signedIn = isLearnerLoggedIn();
        const guest = !signedIn ? guestContact || readGuestContact() : null;
        const email = signedIn
          ? getLearnerEmail()?.trim().toLowerCase() || undefined
          : guest?.email || undefined;
        const profile = readLearnerProfileFromStorage();
        const learnerName = signedIn
          ? profile.name?.trim() || undefined
          : guest?.name || undefined;
        const learnerPhone = signedIn ? undefined : guest?.phone || undefined;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId,
            pagePath: pathname,
            learnerEmail: email,
            learnerName,
            learnerPhone,
            authenticated: signedIn,
            history: priorHistory,
            ...(threadId ? { threadId } : {}),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          reply?: string;
          message?: string;
          threadId?: string;
        };

        const minTypingMs = 450;
        const elapsed = Date.now() - started;
        if (elapsed < minTypingMs) {
          await new Promise((r) => setTimeout(r, minTypingMs - elapsed));
        }

        if (data.threadId) {
          setThreadId(data.threadId);
          storeThreadId(data.threadId);
        }
        if (data.ok && data.reply) {
          const reply = cleanAssistantText(data.reply);
          if (!signedIn && replyAsksForLogin(reply)) {
            savePendingChatQuestion(trimmed);
          }
          setLines((prev) => [...prev, { role: "assistant", content: reply }]);
        } else {
          setLines((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                data.message ??
                "Hmm, I couldn't get that through just now. Mind trying again? Or reach us on the Contact page if it keeps happening.",
            },
          ]);
        }
      } catch {
        setLines((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Looks like a connection hiccup — check your internet and try again in a moment.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [pathname, sending, sessionId, threadId, lines, guestContact, loggedIn, guestStep, handleGuestIntakeTurn],
  );

  sendMessageRef.current = sendMessage;

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    void sendMessage(text);
  }, [input, sendMessage]);

  const startNewChat = () => {
    hasUserMessagedRef.current = false;
    setThreadId("");
    clearStoredThreadId();
    setInput("");
    try {
      sessionStorage.removeItem(GUEST_PENDING_KEY);
    } catch {
      /* ignore */
    }
    if (!isLearnerLoggedIn()) {
      const guest = readGuestContact();
      setGuestContact(guest);
      if (guest) {
        setGuestStep("done");
        setGuestDraft(guest);
        setLearnerDisplayName(guest.name);
      } else {
        setGuestStep("idle");
        setGuestDraft({ name: "", email: "", phone: "" });
        setLearnerDisplayName("there");
      }
    }
    setLines([{ role: "assistant", content: welcomeLine() }]);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const paymentIssueActive = lines.some((line) => looksLikePaymentChat(line.content));

  const showQuickPrompts =
    !sending &&
    !hasUserMessagedRef.current &&
    !paymentIssueActive &&
    (loggedIn || guestStep === "idle" || guestStep === "done");

  const quickPrompts = loggedIn ? LOGGED_IN_QUICK_PROMPTS : QUICK_PROMPTS;
  const showCategoryChips = showQuickPrompts && !loggedIn && categories.length > 0;

  const statusLabel =
    configured === false
      ? "Away — try Contact for help"
      : configured
        ? provider === "local"
          ? "Here to help"
          : "Here to help"
        : "Connecting…";

  const headerSubtitle = loggedIn && learnerDisplayName !== "there"
    ? `Chatting with ${learnerDisplayName}`
    : guestContact
      ? `Guest: ${guestContact.name}`
      : guestStep === "idle"
        ? "Ask your question first"
        : guestStep === "name"
          ? "May I have your name?"
          : guestStep === "email"
            ? "Your email next"
            : guestStep === "phone"
              ? "Your phone next"
              : statusLabel;

  const inputPlaceholder =
    configured === false
      ? "Chat unavailable right now"
      : guestStep === "idle" && !loggedIn && !guestContact
        ? "Describe your question, help need, or issue…"
        : guestStep === "name"
          ? "Type your full name…"
          : guestStep === "email"
            ? "Type your Gmail / email…"
            : guestStep === "phone"
              ? "Type your phone number…"
              : "Ask me anything…";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div
          role="dialog"
          aria-label={CHATBOT_FULL_NAME}
          className="pointer-events-auto flex h-[min(560px,calc(100vh-5rem))] w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_24px_64px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-[#FFB800] to-yellow-300" />

          <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-zinc-900/80 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-black p-1.5">
                <ChatLogo size="sm" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-snug text-white">
                  {CHATBOT_NAME}
                </p>
                <p className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  {configured !== false ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  ) : null}
                  {headerSubtitle}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-amber-200"
                aria-label="Start new chat"
                title="New chat"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800"
          >
            {lines.map((line, i) => (
              <div
                key={`${line.role}-${i}`}
                className={`flex gap-2 ${line.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {line.role === "assistant" ? <ChatLogo size="sm" /> : null}
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm ${
                    line.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-amber-400 to-amber-500 text-black"
                      : "rounded-bl-md border border-white/5 bg-zinc-900/80 text-zinc-100"
                  }`}
                >
                  {line.role === "assistant" ? (
                    <ChatMessageContent text={line.content} isUser={false} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{line.content}</p>
                  )}
                </div>
              </div>
            ))}

            {showQuickPrompts ? (
              <div className="space-y-3 pt-1">
                {showCategoryChips ? (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      <Sparkles size={12} className="text-amber-400" />
                      Browse by category
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categories.slice(0, 6).map((cat) => (
                        <button
                          key={cat.slug}
                          type="button"
                          disabled={sending || configured === false}
                          onClick={() => void sendMessage(cat.prompt)}
                          className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-left text-xs font-medium text-zinc-200 transition hover:border-amber-400/40 hover:bg-zinc-800 disabled:opacity-40"
                        >
                          {cat.label}
                          <span className="ml-1 text-[10px] text-zinc-500">({cat.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Quick questions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        disabled={sending || configured === false}
                        onClick={() => void sendMessage(item.text)}
                        className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-left text-xs font-medium text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-500/20 disabled:opacity-40"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {configured === false ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100/90">
                Chat is not configured on this server.{" "}
                <Link href="/contact" className="font-semibold text-amber-300 underline">
                  Contact us
                </Link>{" "}
                for help.
              </div>
            ) : null}

            {sending ? <TypingIndicator /> : null}
          </div>

          <footer className="border-t border-white/10 bg-zinc-900/80 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={inputPlaceholder}
                disabled={sending || configured === false}
                className="min-h-[44px] flex-1 resize-none rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !input.trim() || configured === false}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </footer>
        </div>
      ) : null}

      {!open ? (
        <div className="pointer-events-auto relative group">
          <div className="absolute -inset-1 rounded-full bg-amber-500/40 opacity-60 blur-md transition group-hover:opacity-80 animate-pulse" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/80 bg-zinc-950 shadow-2xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            aria-label={`Open ${CHATBOT_FULL_NAME}`}
          >
            <Image
              src={sfWhiteLogo}
              alt=""
              className="h-9 w-auto object-contain p-1"
              sizes="36px"
              priority
            />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black">
              <MessageCircle size={12} strokeWidth={2.5} />
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
