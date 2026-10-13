"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Layers, Loader2, Radio, Search, Wrench } from "lucide-react";

type Result = { kind: string; title: string; href: string; meta?: string };

const KIND_ICON: Record<string, typeof BookOpen> = {
  course: BookOpen,
  "tutor-led": Radio,
  workshop: Wrench,
  category: Layers,
};

type Props = {
  variant: "desktop" | "mobile";
  isLight?: boolean;
  goldGradient?: string;
  onNavigate?: () => void;
};

export function HeaderSearch({ variant, isLight = false, goldGradient = "", onNavigate }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=7`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { results?: Result[] }) => {
          setResults(data.results ?? []);
          setActive(-1);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  const submit = () => {
    const q = query.trim();
    if (active >= 0 && results[active]) return go(results[active].href);
    if (q) go(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length >= 2;
  const desktop = variant === "desktop";

  return (
    <div ref={boxRef} className={desktop ? "relative flex flex-1 items-center gap-2.5" : "relative"}>
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className={`pointer-events-none absolute inset-y-0 left-3 flex items-center`}>
          <Search className={`h-4 w-4 ${desktop ? (isLight ? "text-slate-500" : "text-amber-300/70") : "text-amber-500"}`} />
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (e.target.value.trim().length < 2) setResults([]);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={desktop ? "What do you want to learn?" : "Search courses and resources"}
          aria-label="Search courses"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          className={
            desktop
              ? `w-full rounded-full border py-2.5 pl-10 pr-4 text-[14px] transition-all focus:outline-none ${
                  isLight
                    ? "border-[#b4965a]/45 bg-[#f6efe3] text-slate-800 placeholder:text-slate-500 focus:border-[#9a7222] focus:shadow-[0_0_0_3px_rgba(212,160,23,0.2)]"
                    : "border-amber-500/40 bg-black/40 text-gray-100 placeholder:text-gray-500 focus:border-amber-400/70"
                }`
              : "w-full rounded-md border border-white/10 bg-white/5 py-3 pl-10 pr-4"
          }
        />
      </form>
      {desktop ? (
        <button
          type="button"
          aria-label="Search courses"
          onClick={submit}
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black transition-all hover:brightness-110 ${goldGradient}`}
        >
          <Search className="h-4 w-4" />
        </button>
      ) : null}

      {showDropdown ? (
        <div
          role="listbox"
          className={`absolute left-0 top-full z-80 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border shadow-2xl ${
            desktop ? "right-12" : "right-0"
          } ${isLight ? "border-[#b4965a]/40 bg-[#fffaf1] text-slate-800" : "border-amber-500/30 bg-[#0d0d10] text-gray-100"}`}
        >
          {loading && results.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm opacity-70">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm opacity-70">No courses found for &ldquo;{query.trim()}&rdquo;</p>
          ) : (
            <ul>
              {results.map((r, i) => {
                const Icon = KIND_ICON[r.kind] ?? BookOpen;
                return (
                  <li key={`${r.kind}-${r.href}`} role="option" aria-selected={i === active}>
                    <Link
                      href={r.href}
                      onClick={(e) => {
                        e.preventDefault();
                        go(r.href);
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={`flex items-start gap-3 px-4 py-2.5 text-sm ${
                        i === active ? (isLight ? "bg-amber-100" : "bg-amber-500/15") : ""
                      }`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{r.title}</span>
                        {r.meta ? <span className="block truncate text-xs opacity-60">{r.meta}</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
            className={`block w-full border-t px-4 py-2.5 text-left text-xs font-semibold text-amber-500 ${
              isLight ? "border-[#b4965a]/30 hover:bg-amber-50" : "border-white/10 hover:bg-white/5"
            }`}
          >
            See all results for &ldquo;{query.trim()}&rdquo; →
          </button>
        </div>
      ) : null}
    </div>
  );
}
