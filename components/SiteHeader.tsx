"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Globe, Menu, Moon, Search, ShoppingCart, Sun, X } from "lucide-react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import sfLightLogo from "@/Untitled design (4).png";
import {
  profileInitial,
  readLearnerProfileFromStorage,
  clearLearnerProfileStorage,
  type LearnerAuthProfile,
} from "@/lib/auth-profile";
import {
  getLearnerEmail,
  syncLearnerEmailCookie,
  syncLearnerProfileFromServer,
} from "@/lib/learner-session-client";
import MyLearningHeaderLink from "@/components/MyLearningHeaderLink";
import { PricingRegionBadge } from "@/components/PricingRegionBadge";
import HeaderExploreMenu from "@/components/HeaderExploreMenu";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

const AUDIENCE_TABS = [
  { id: "industry", label: "Industry Professionals" },
  { id: "auditor", label: "Auditors & Auditor-Interns" },
  { id: "university", label: "University/College Students" },
  { id: "associators", label: "Associates & Trainers" },
] as const;

type AudienceId = (typeof AUDIENCE_TABS)[number]["id"];

const AUDIENCE_STORAGE_KEY = "sft_audience";

function isAudienceId(value: string | null | undefined): value is AudienceId {
  return AUDIENCE_TABS.some((tab) => tab.id === value);
}

function AudienceTabLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-baseline gap-1 truncate">
      <span className="shrink-0 font-serif text-[12px] font-bold italic lowercase tracking-wide text-amber-300 sm:text-[13px]">
        for
      </span>
      <span className="truncate text-[12px] font-bold tracking-tight sm:text-[13px]">{label}</span>
    </span>
  );
}

export default function SiteHeader({ forceDarkChrome = false }: { forceDarkChrome?: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeAudience, setActiveAudience] = useState<AudienceId>("industry");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<LearnerAuthProfile>({});
  const [cartCount, setCartCount] = useState(0);
  const goldGradient = "bg-gradient-to-b from-[#f9b14d] to-[#eb9422]";
  const goldText = theme === "light" && !forceDarkChrome ? "text-[#8a6412]" : "text-[#fde68a]";
  const languages = ["English", "Hindi", "Spanish", "French", "German", "Arabic"];
  const myLearningMenu = [
    { label: "🎓 My Learning", href: "/my-learning?tab=dashboard" },
    { label: "📚 Courses", href: "/courses" },
    { label: "📖 My Courses", href: "/my-learning?tab=learning" },
    { label: "🎥 Tutor Led", href: "/my-learning?tab=live" },
    { label: "📅 Calendar", href: "/my-learning/calendar" },
    { label: "📝 Assignments", href: "/my-learning?tab=assignments" },
    { label: "💬 Community", href: "/my-learning?tab=community" },
    { label: "💳 Subscriptions", href: "/my-learning?tab=subscriptions" },
    { label: "📜 Certificate Records", href: "/my-learning?tab=certificates" },
    { label: "🏆 Achievements", href: "/my-learning?tab=achievements" },
  ];
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Courses", href: "/courses" },
    { label: "Contact", href: "/contact" },
  ] as const;
  const audienceTabs = AUDIENCE_TABS;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isContactPage = pathname === "/contact";
  const isMyLearningArea = pathname.startsWith("/my-learning");
  const useLearnerDashboardChrome = isLoggedIn && isMyLearningArea;
  const compactHeader = isContactPage && !useLearnerDashboardChrome;
  /** After login, home highlights My Learning (not Home). */
  const highlightMyLearningNav = isLoggedIn && (pathname === "/" || isMyLearningArea);

  useEffect(() => {
    const fromUrl = searchParams.get("for");
    if (isAudienceId(fromUrl)) {
      setActiveAudience(fromUrl);
      window.localStorage.setItem(AUDIENCE_STORAGE_KEY, fromUrl);
      return;
    }
    if (pathname === "/") {
      return;
    }
    const saved = window.localStorage.getItem(AUDIENCE_STORAGE_KEY);
    if (isAudienceId(saved)) setActiveAudience(saved);
  }, [pathname, searchParams]);

  useEffect(() => {
    const saved = window.localStorage.getItem("sft_theme");
    const initialTheme =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("sft_theme", theme);
  }, [theme]);

  useEffect(() => {
    const applyLocalAuth = () => {
      const loggedIn = window.localStorage.getItem("sft_logged_in") === "true";
      setIsLoggedIn(loggedIn);
      setUserProfile(readLearnerProfileFromStorage());
      syncLearnerEmailCookie();
      return loggedIn;
    };

    const syncFromServer = () => {
      const email = getLearnerEmail();
      if (!email) return;
      void syncLearnerProfileFromServer(email).then((p) => {
        if (p) setUserProfile(p);
      });
    };

    if (applyLocalAuth()) syncFromServer();

    const onStorage = () => {
      if (applyLocalAuth()) syncFromServer();
    };
    const onAuthUpdated = () => {
      applyLocalAuth();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("sft_auth_updated", onAuthUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sft_auth_updated", onAuthUpdated);
    };
  }, []);

  useEffect(() => {
    const syncCart = () => {
      try {
        const raw = window.localStorage.getItem("sft_cart");
        if (!raw) {
          setCartCount(0);
          return;
        }
        const parsed = JSON.parse(raw) as Array<{ qty?: number }>;
        const count = Array.isArray(parsed)
          ? parsed.reduce((sum, item) => sum + (typeof item.qty === "number" ? item.qty : 1), 0)
          : 0;
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    };

    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("sft_cart_updated", syncCart);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("sft_cart_updated", syncCart);
    };
  }, []);

  const handleLogout = () => {
    window.localStorage.removeItem("sft_logged_in");
    window.localStorage.removeItem("sft_learner_email");
    window.localStorage.removeItem("sft_user_role");
    window.sessionStorage.removeItem("sft_admin_access_email");
    clearLearnerProfileStorage();
    setIsLoggedIn(false);
    setUserProfile({});
    setIsProfileOpen(false);
    window.location.href = "/";
  };

  const profileAvatar = userProfile.avatarUrl?.trim();
  const profileLabel = profileInitial(userProfile.name, userProfile.email ?? getLearnerEmail());
  const isLight = theme === "light" && !forceDarkChrome;

  return (
    <>
      <header
        className={`site-header sticky top-0 z-[100] border-b backdrop-blur-md ${
          isLight
            ? "border-[#b4965a]/45 bg-linear-to-b from-[#f8f4ec]/95 to-[#efe7da]/95 text-slate-900 shadow-[0_10px_28px_rgba(148,118,59,0.16)]"
            : "border-white/5 bg-[#0a0a0a]/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
        }`}
      >
        <div
          className={`relative z-[110] hidden pointer-events-auto md:block ${compactHeader ? "!hidden" : ""} ${
            isLight
              ? "border-b border-[#b4965a]/40 bg-[#dccfba]"
              : "border-b border-amber-500/25 bg-[#05070c]"
          }`}
        >
          <div className="mx-auto flex w-full max-w-[1760px] items-end gap-1.5 px-4 pt-2.5 xl:px-6">
            {audienceTabs.map((tab) => {
              const active = activeAudience === tab.id && pathname.startsWith("/coming-soon");
              const href = `/coming-soon?for=${tab.id}`;
              return (
                <Link
                  key={tab.id}
                  href={href}
                  scroll={pathname.startsWith("/coming-soon")}
                  onClick={() => {
                    setActiveAudience(tab.id);
                    window.localStorage.setItem(AUDIENCE_STORAGE_KEY, tab.id);
                  }}
                  className={`chrome-audience-tab group relative -mb-px inline-flex min-h-11 min-w-0 max-w-[20rem] flex-1 cursor-pointer items-center justify-center truncate px-3 pb-3 pt-2.5 outline-none transition-[background-color,color,box-shadow,transform,border-color] sm:flex-none sm:max-w-none sm:px-4 ${
                    active
                      ? isLight
                        ? "z-10 rounded-t-xl border border-b-0 border-[#b4965a]/70 bg-linear-to-b from-[#fff8ec] to-[#f8f4ec] text-[#6a4a0c] shadow-[0_-4px_18px_rgba(212,160,23,0.28)]"
                        : "z-10 rounded-t-xl border border-b-0 border-amber-400/55 bg-linear-to-b from-[#1c160c] via-[#12100a] to-[#0a0a0a] text-amber-50 shadow-[0_-4px_20px_rgba(245,158,11,0.28)]"
                      : isLight
                        ? "rounded-t-lg border border-[#b4965a]/35 bg-[#cbb89a] text-slate-800 hover:-translate-y-0.5 hover:border-[#9a7222] hover:bg-[#d8c6a6] hover:text-[#6a4a0c]"
                        : "rounded-t-lg border border-amber-400/25 bg-[#141922] text-amber-100 hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-[#1c2433] hover:text-white"
                  }`}
                >
                  {active ? (
                    <span
                      className={`pointer-events-none absolute inset-x-3 top-0 h-[3px] rounded-b-full ${
                        isLight
                          ? "bg-gradient-to-r from-[#d4a017] via-[#f0c14b] to-[#d4a017]"
                          : "bg-gradient-to-r from-[#eb9422] via-[#f9b14d] to-[#eb9422]"
                      }`}
                      aria-hidden
                    />
                  ) : null}
                  {active ? (
                    <>
                      <span
                        className={`pointer-events-none absolute -left-2 bottom-0 h-2.5 w-2.5 ${
                          isLight ? "bg-[#f8f4ec]" : "bg-[#0a0a0a]"
                        }`}
                        style={{
                          maskImage: "radial-gradient(circle at 0 0, transparent 70%, #000 72%)",
                          WebkitMaskImage: "radial-gradient(circle at 0 0, transparent 70%, #000 72%)",
                        }}
                        aria-hidden
                      />
                      <span
                        className={`pointer-events-none absolute -right-2 bottom-0 h-2.5 w-2.5 ${
                          isLight ? "bg-[#f8f4ec]" : "bg-[#0a0a0a]"
                        }`}
                        style={{
                          maskImage: "radial-gradient(circle at 100% 0, transparent 70%, #000 72%)",
                          WebkitMaskImage: "radial-gradient(circle at 100% 0, transparent 70%, #000 72%)",
                        }}
                        aria-hidden
                      />
                    </>
                  ) : null}
                  <AudienceTabLabel label={tab.label} />
                </Link>
              );
            })}
            <div className="min-w-4 flex-1" aria-hidden />
          </div>
        </div>
        <div
          className={`mx-auto flex w-full max-w-[1760px] flex-nowrap items-center justify-between gap-3 px-4 xl:px-6 ${
            compactHeader ? "h-14" : "h-18"
          }`}
        >
          <Link href="/" className="group flex shrink-0 cursor-pointer items-center gap-3">
            <Image
              src={isLight ? sfLightLogo : sfWhiteLogo}
              alt={COMPANY_DISPLAY_NAME}
              priority
              className={`w-auto object-contain ${compactHeader ? "h-11" : "h-16"}`}
            />
            <div className="hidden md:block">
              <p
                className={`whitespace-nowrap font-extrabold tracking-tight ${goldText} ${
                  compactHeader ? "text-base" : "text-lg"
                }`}
              >
                {COMPANY_DISPLAY_NAME}
              </p>
            </div>
          </Link>

          <div className="hidden max-w-[860px] grow items-center gap-2.5 md:flex">
            <HeaderExploreMenu isLight={isLight} />
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Search className={`h-4 w-4 ${isLight ? "text-slate-500" : "text-amber-300/70"}`} />
              </div>
              <input
                type="search"
                placeholder="What do you want to learn?"
                className={`w-full rounded-full border py-2.5 pl-10 pr-4 text-[14px] transition-all focus:outline-none ${
                  isLight
                    ? "border-[#b4965a]/45 bg-[#f6efe3] text-slate-800 placeholder:text-slate-500 focus:border-[#9a7222] focus:shadow-[0_0_0_3px_rgba(212,160,23,0.2)]"
                    : "border-amber-500/40 bg-black/40 text-gray-100 placeholder:text-gray-500 focus:border-amber-400/70"
                }`}
              />
            </div>
            <button
              type="button"
              aria-label="Search courses"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-black transition-all hover:brightness-110 ${goldGradient}`}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center gap-2 text-[14px] font-bold">
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              className={`hidden shrink-0 items-center gap-2 rounded-full border px-2 py-1 transition-colors md:inline-flex ${
                isLight
                  ? "border-[#b4965a]/45 bg-[#f6efe3] text-slate-700 hover:bg-[#ecdfcb]"
                  : "border-white/15 bg-white/5 text-amber-100 hover:border-amber-400/60 hover:text-amber-200"
              }`}
              aria-label="Toggle light and dark theme"
              title="Toggle theme"
            >
              <Sun size={14} className={isLight ? "text-slate-700" : "text-gray-500"} />
              <span
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  isLight ? "bg-slate-300" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full ${isLight ? "bg-[#f8f4ec]" : "bg-white"} transition-all ${
                    isLight ? "left-4" : "left-0.5"
                  }`}
                />
              </span>
              <Moon size={14} className={isLight ? "text-slate-500" : "text-amber-300"} />
            </button>
            <div className="relative hidden shrink-0 md:block">
              <button
                type="button"
                onClick={() => setIsLanguageOpen((prev) => !prev)}
                className={`rounded-full border p-2 transition-colors ${
                  isLight
                    ? "border-[#b4965a]/45 bg-[#f6efe3] text-slate-700 hover:border-[#9a7222] hover:text-[#7a5610]"
                    : "border-white/15 bg-white/5 text-gray-200 hover:border-amber-400/60 hover:text-amber-200"
                }`}
                aria-label="Select language"
              >
                <Globe size={16} />
              </button>
              {isLanguageOpen && (
                <div
                  className={`absolute right-0 top-11 z-50 min-w-[150px] rounded-xl border p-1 shadow-xl ${
                    isLight
                      ? "border-[#b4965a]/45 bg-[#f6efe3]"
                      : "border-white/15 bg-[#101010]"
                  }`}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setIsLanguageOpen(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedLanguage === lang
                          ? isLight
                            ? "bg-amber-200/45 text-[#7a5610]"
                            : "bg-amber-500/20 text-amber-200"
                          : isLight
                            ? "text-slate-700 hover:bg-amber-100/45"
                            : "text-gray-200 hover:bg-white/10"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isLoggedIn ? (
              <div className="flex shrink-0 flex-nowrap items-center gap-2">
                {!forceDarkChrome ? <PricingRegionBadge className="hidden md:inline-flex" /> : null}
                <Link
                  href="/my-learning?tab=dashboard"
                  className={`relative shrink-0 rounded-full border p-2 transition-colors ${
                    isLight
                      ? "border-[#b4965a]/45 bg-[#f6efe3] text-slate-700 hover:border-[#9a7222] hover:text-[#7a5610]"
                      : "border-white/15 bg-white/5 text-gray-200 hover:border-amber-400/60 hover:text-amber-200"
                  }`}
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
                </Link>
                <Link
                  href="/cart"
                  className={`relative shrink-0 rounded-full border p-2 transition-colors ${
                    isLight
                      ? "border-[#b4965a]/45 bg-[#f6efe3] text-slate-700 hover:border-[#9a7222] hover:text-[#7a5610]"
                      : "border-white/15 bg-white/5 text-gray-200 hover:border-amber-400/60 hover:text-amber-200"
                  }`}
                  aria-label="Cart"
                >
                  <ShoppingCart size={16} />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    className="h-9 w-9 overflow-hidden rounded-full border border-amber-300/60 bg-linear-to-br from-[#f9b14d] to-[#eb9422] p-px shadow-[0_0_18px_rgba(249,177,77,0.35)]"
                    aria-label="Open profile menu"
                  >
                    {profileAvatar ? (
                      <Image
                        src={profileAvatar}
                        alt={userProfile.name ?? "Profile"}
                        width={36}
                        height={36}
                        className="h-full w-full rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center rounded-full bg-[#121212] text-sm font-semibold text-amber-100">
                        {profileLabel}
                      </span>
                    )}
                  </button>
                  {isProfileOpen && (
                    <div
                      className={`absolute right-0 top-11 z-50 min-w-[200px] rounded-xl border p-1 shadow-xl ${
                        isLight
                          ? "border-[#b4965a]/45 bg-[#f6efe3]"
                          : "border-white/15 bg-[#101010]"
                      }`}
                    >
                      <div
                        className={`border-b px-3 py-2 ${isLight ? "border-[#b4965a]/25" : "border-white/10"}`}
                      >
                        <p className={`truncate text-sm font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                          {userProfile.name ?? "Learner"}
                        </p>
                        <p className={`truncate text-xs ${isLight ? "text-slate-600" : "text-gray-400"}`}>
                          {userProfile.email ?? getLearnerEmail()}
                        </p>
                      </div>
                      {userProfile.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isLight ? "text-slate-700 hover:bg-amber-100/45" : "text-amber-200 hover:bg-white/10"
                          }`}
                        >
                          Admin panel
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          isLight ? "text-slate-700 hover:bg-amber-100/45" : "text-gray-200 hover:bg-white/10"
                        }`}
                      >
                        Profile & settings
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/15"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/account?mode=login"
                  className={`whitespace-nowrap px-5 py-2 transition-colors hover:text-amber-400 ${isLight ? "text-slate-700" : "text-white"}`}
                >
                  Log In
                </Link>

                <Link
                  href="/account?mode=signup"
                  className={`${goldGradient} ml-2 whitespace-nowrap rounded-[20px] px-5 py-2 text-[14px] font-bold text-black shadow-md transition-all hover:brightness-110 active:scale-95`}
                >
                  Sign Up
                </Link>
              </>
            )}

            <button
              type="button"
              className="ml-2 p-2 text-amber-500 md:hidden"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {!useLearnerDashboardChrome ? (
          <div className={`hidden border-t md:block ${isLight ? "border-[#b4965a]/35" : "border-white/5"}`}>
            <div
              className={`mx-auto flex w-full max-w-[1760px] items-center gap-8 px-4 font-bold xl:px-6 ${
                compactHeader ? "h-9 text-[12px]" : "h-10 text-[13px]"
              } ${isLight ? "text-slate-700" : "text-gray-400"}`}
            >
              {navLinks.map((item) => {
                const isActive =
                  pathname === item.href &&
                  !(highlightMyLearningNav && pathname === "/" && item.href === "/");
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`border-b-2 py-2 transition-colors ${
                      isActive
                        ? isLight
                          ? "border-[#b8860b] text-[#7a5610]"
                          : "border-amber-400 text-amber-200"
                        : isLight
                          ? "border-transparent hover:text-[#8a6412]"
                          : "border-transparent hover:text-amber-400"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {isLoggedIn ? (
                <MyLearningHeaderLink active={highlightMyLearningNav && !isMyLearningArea} />
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-60 flex flex-col bg-[#0a0a0a] transition-opacity duration-200">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <span className={`text-lg font-bold ${goldText}`}>Menu</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsMenuOpen(false)}
              className="text-amber-500"
            >
              <X className="cursor-pointer" size={24} />
            </button>
          </div>
          <div className="space-y-6 overflow-y-auto p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-amber-500" />
              <input
                type="search"
                placeholder="Search courses and resources"
                className="w-full rounded-md border border-white/10 bg-white/5 py-3 pl-10 pr-4"
              />
            </div>
            <div className="relative z-[70]">
              <HeaderExploreMenu isLight={false} />
            </div>
            <nav className="flex flex-col gap-6 text-lg font-medium text-gray-300">
              {useLearnerDashboardChrome ? (
                myLearningMenu.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="hover:text-amber-400"
                  >
                    {item.label}
                  </Link>
                ))
              ) : (
                <>
                  {navLinks.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="hover:text-amber-400"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {isLoggedIn && (
                    <Link
                      href="/my-learning?tab=dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className={
                        highlightMyLearningNav
                          ? "rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-amber-100"
                          : "hover:text-amber-400"
                      }
                    >
                      My Learning
                    </Link>
                  )}
                </>
              )}
            </nav>
            <div className="flex flex-col gap-4 pt-6">
              {isLoggedIn && !forceDarkChrome ? <PricingRegionBadge compact className="self-start md:hidden" /> : null}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <Globe size={16} />
                  Language
                </div>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-amber-400/60 focus:outline-none"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
              {isLoggedIn ? (
                <>
                  <Link
                    href="/my-learning?tab=dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full rounded-xl border border-white/10 bg-white/5 py-4 text-center font-bold"
                  >
                    Notifications
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full rounded-xl border border-white/10 bg-white/5 py-4 text-center font-bold"
                  >
                    Cart {cartCount > 0 ? `(${cartCount})` : ""}
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className={`block w-full rounded-xl py-4 text-center font-bold text-black ${goldGradient}`}
                  >
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/account?mode=login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full rounded-xl border border-white/10 bg-white/5 py-4 text-center font-bold"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/account?mode=signup"
                    onClick={() => setIsMenuOpen(false)}
                    className={`block w-full rounded-xl py-4 text-center font-bold text-black ${goldGradient}`}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
