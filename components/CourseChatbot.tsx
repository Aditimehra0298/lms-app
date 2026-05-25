"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { nanoid } from "nanoid";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import {
  MessageSquare,
  Send,
  X,
  Loader2,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Cpu
} from "lucide-react";

interface CourseChatbotProps {
  courseTitle?: string;
  courseSlug?: string;
}

// Custom hook to parse Vercel AI SDK AssistantResponse streaming protocol.
// This decouples the client from version-incompatible exports in @ai-sdk/react.
function useAssistant({ api }: { api: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "in_progress" | "error" | "awaiting_message">("awaiting_message");
  const [threadId, setThreadId] = useState<string | null>(null);

  // Load threadId from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("orion_thread_id");
    if (saved) {
      setThreadId(saved);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const submitMessage = async (e?: React.FormEvent<HTMLFormElement> | string) => {
    if (e && typeof e !== "string" && e.preventDefault) {
      e.preventDefault();
    }
    const messageToSend = typeof e === "string" ? e : input;
    if (!messageToSend.trim()) return;

    // Append user message to history
    const userMsg = { id: nanoid(), role: "user", content: messageToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStatus("in_progress");

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: messageToSend,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with support agent.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream received.");
      }

      const decoder = new TextDecoder();
      const assistantMsgId = nanoid();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
        }

        // Process line-by-line streaming protocol parts
        let lineEnd = buffer.indexOf("\n");
        while (lineEnd !== -1) {
          const line = buffer.substring(0, lineEnd).trim();
          buffer = buffer.substring(lineEnd + 1);
          lineEnd = buffer.indexOf("\n");

          if (!line) continue;

          const colonIdx = line.indexOf(":");
          if (colonIdx === -1) continue;

          const type = line.substring(0, colonIdx);
          const dataStr = line.substring(colonIdx + 1);

          try {
            if (type === "0") {
              // Text delta
              const textDelta = JSON.parse(dataStr);
              assistantContent += textDelta;
              setMessages(prev => {
                const idx = prev.findIndex(m => m.id === assistantMsgId);
                if (idx === -1) {
                  return [
                    ...prev,
                    {
                      id: assistantMsgId,
                      role: "assistant",
                      content: assistantContent,
                    },
                  ];
                } else {
                  return prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: assistantContent } : m
                  );
                }
              });
            } else {
              // Control data or arbitrary JSON stream messages (e.g. support tokens)
              const parsed = JSON.parse(dataStr);
              if (parsed && typeof parsed === "object") {
                if ("threadId" in parsed) {
                  // Capture thread persistence
                  const newThreadId = parsed.threadId;
                  setThreadId(newThreadId);
                  localStorage.setItem("orion_thread_id", newThreadId);
                } else {
                  // Capture out-of-band JSON packets (support tokens)
                  const items = Array.isArray(parsed) ? parsed : [parsed];
                  setMessages(prev => {
                    const next = [...prev];
                    for (const item of items) {
                      next.push({
                        id: nanoid(),
                        role: "data",
                        content: "",
                        data: item,
                      });
                    }
                    return next;
                  });
                }
              }
            }
          } catch (err) {
            console.error("Error parsing stream part:", line, err);
          }
        }

        if (done) break;
      }
      setStatus("awaiting_message");
    } catch (error) {
      console.error("Assistant connection error:", error);
      setStatus("error");
      setMessages(prev => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: "I ran into a connection issue. Please verify your internet and try again.",
        },
      ]);
    }
  };

  return {
    status,
    messages,
    input,
    setInput,
    submitMessage,
    handleInputChange,
  };
}

export default function CourseChatbot({ courseTitle = "SF Trainings", courseSlug }: CourseChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latestToken, setLatestToken] = useState<{ token: string; query: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook into our custom, self-contained useAssistant implementation
  const {
    status,
    messages,
    input,
    setInput,
    submitMessage,
    handleInputChange,
  } = useAssistant({
    api: "/api/chat-assistant",
  });

  // Auto-scroll to the bottom of the chat window when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  // Monitor incoming data messages to extract the technical support token
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "data") {
      const dataObj = lastMessage.data as any;
      if (dataObj && dataObj.type === "technical_issue_token") {
        setLatestToken({
          token: dataObj.token,
          query: dataObj.issueDescription || "",
        });
      }
    }
  }, [messages]);

  const cleanMessageContent = (text: string) => {
    if (!text) return "";
    // Remove OpenAI File Search citations like 【6:0†course details.docx】
    return text.replace(/【[^】]*】/g, "");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pre-configured quick support pills for reporting issues
  const quickActions = [
    { label: "🎥 Video buffering", text: "I'm having a technical issue: the video player won't start loading." },
    { label: "💳 Checkout stuck", text: "I'm having a technical issue: the checkout payment window is stuck." },
    { label: "🧩 Frozen quiz", text: "I'm having a technical issue: the quiz window is frozen and won't submit." },
    { label: "🔑 Login failed", text: "I'm having a technical issue: I'm unable to login due to an incorrect password error." },
    { label: "📜 Certificate error", text: "I'm having a technical issue: my course completion certificate is not generating." },
    { label: "📅 Batch details", text: "When is the next batch starting and what is the schedule?" },
  ];

  const handleQuickAction = async (text: string) => {
    setInput(text);
    setTimeout(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  // Filter out pure "data" messages from rendering in the general text bubble list
  const chatMessages = messages.filter((m) => m.role !== "data");

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 1. Floating Toggle Button with Pulse Glow */}
      {!isOpen && (
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-full bg-[#FFB800] opacity-50 blur group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-[#FFB800] border-2 border-[#FFB800] shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-[#FFB800] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#FFB800]/50"
            aria-label="Open Course Chatbot"
          >
            <MessageSquare className="h-6 w-6 transition-transform duration-300 group-hover:rotate-6" />
          </button>
        </div>
      )}

      {/* 2. Premium Chat Panel */}
      {isOpen && (
        <div className="flex h-[600px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-500 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-10">

          {/* Glowing Top bar accent */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-[#FFB800] to-yellow-300" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/70 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-950 border border-[#FFB800]/30 p-1.5 shadow-inner">
                <Image
                  src={sfWhiteLogo}
                  alt="Sustainable Futures Trainings"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">SFT Support Assistant</h3>
                <p className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                  <span>Course Assistant</span>
                  <span className="inline-block h-1 w-1 rounded-full bg-zinc-600" />
                  <span className="text-[#FFB800] truncate max-w-[120px]">{courseTitle}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition duration-200"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {/* Initial Welcome Message */}
            <div className="flex max-w-[85%] flex-col rounded-2xl rounded-tl-none border border-white/5 bg-zinc-900/40 p-4 text-sm text-zinc-300 shadow-md">
              <p className="leading-relaxed">
                Welcome! I’m SFT Assistant, your AI-powered LMS support guide.
              </p>
              <p className="mt-2 leading-relaxed">
                I can help you with course-related questions, training schedules, platform navigation, and common technical issues within the SFT Learning Management System.
              </p>
              <div className="mt-3.5 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-[#FFB800]/20 p-2 text-xs text-amber-200/90">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#FFB800]" />
                <p>
                  Encountering issues like buffering videos, stuck checkouts, or quiz errors?
                  Generate a <strong>support ticket</strong> directly through the assistant for faster resolution.
                </p>
              </div>
            </div>

            {/* Chat History */}
            {chatMessages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex max-w-[85%] flex-col rounded-2xl px-4 py-3 text-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${isUser
                    ? "ml-auto rounded-tr-none bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border border-white/10 shadow-lg"
                    : "mr-auto rounded-tl-none border border-white/5 bg-zinc-900/60 text-zinc-100 shadow-sm"
                    }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{cleanMessageContent(m.content)}</p>
                </div>
              );
            })}

            {/* Loader / Thinking State */}
            {status === "in_progress" && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-tl-none border border-white/5 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin text-[#FFB800]" />
                <span>SFT Support Assistant is scanning system details...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-Action Pills Panel */}
          {chatMessages.length === 0 && status === "awaiting_message" && (
            <div className="px-4 pb-3 space-y-2 animate-in fade-in duration-500">
              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 px-1">
                Common Support Actions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.text)}
                    className="rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-[#FFB800]/30 px-3 py-1.5 text-xs text-zinc-300 hover:text-[#FFB800] transition duration-200 text-left"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Glowing Support Token Banner Overlay */}
          {latestToken && (
            <div className="mx-4 mb-3 rounded-xl border border-[#FFB800]/40 bg-gradient-to-r from-[#FFB800]/15 to-amber-600/5 p-3.5 shadow-[0_0_20px_rgba(255,184,0,0.15)] animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-950 border border-[#FFB800]/30">
                    <Sparkles className="h-4 w-4 text-[#FFB800]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-extrabold tracking-widest text-[#FFB800]">
                      LMS Support Token Generated
                    </p>
                    <p className="font-mono text-xs font-bold text-white tracking-wider truncate mt-0.5">
                      {latestToken.token}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard(latestToken.token)}
                    className="rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-[#FFB800]/20 px-2.5 py-1.5 text-[10px] font-bold text-white hover:text-[#FFB800] transition duration-200 flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setLatestToken(null)}
                    className="rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-white/10 p-1.5 text-zinc-400 hover:text-white transition duration-200"
                    aria-label="Dismiss Token"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 border-t border-[#FFB800]/10 pt-2 flex items-center gap-1.5">
                <span className="text-[9px] text-zinc-400 italic truncate block">
                  Logged Issue: "{latestToken.query}"
                </span>
              </div>
            </div>
          )}

          {/* Form Input Area */}
          <form
            id="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (status !== "in_progress") {
                submitMessage(e);
              }
            }}
            className="border-t border-white/5 bg-zinc-900/30 p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 transition-all duration-300 focus-within:border-[#FFB800]/60 focus-within:shadow-[0_0_15px_rgba(255,184,0,0.05)]">
              <input
                disabled={status === "in_progress"}
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50"
                value={input}
                placeholder="Ask details or report an LMS system error..."
                onChange={handleInputChange}
              />
              <button
                type="submit"
                disabled={!input.trim() || status === "in_progress"}
                className="rounded-lg bg-[#FFB800] p-2 text-black transition-all duration-200 hover:bg-[#e5a500] hover:scale-105 active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:scale-100"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between px-1 text-[9px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Cpu className="h-2.5 w-2.5 text-[#FFB800]" />
                System Diagnostics Active
              </span>
              {/* {latestToken ? (
                <span className="inline-flex items-center gap-1 text-[#FFB800] font-bold tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFB800] animate-ping" /> Support Token active
                </span>
              ) : (
                <span>Powered by OpenAI</span>
              )} */}
            </div>
          </form>

        </div>
      )}
    </div>
  );
}
