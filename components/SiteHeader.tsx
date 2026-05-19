"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Globe, Menu, Moon, Search, ShoppingCart, Sun, X } from "lucide-react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import sfLightLogo from "@/Untitled design (4).png";

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeAudience, setActiveAudience] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const goldGradient = "bg-gradient-to-b from-[#f9b14d] to-[#eb9422]";
  const goldText = theme === "light" ? "text-[#8a6412]" : "text-[#fde68a]";
  const languages = ["English", "Hindi", "Spanish", "French", "German", "Arabic"];
  const myLearningMenu = [
    { label: "🏠 Dashboard", href: "/my-learning?tab=dashboard" },
    { label: "🎓 My Learning", href: "/my-learning?tab=learning" },
    { label: "🎥 Tutor Led", href: "/tutor-led" },
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
    { label: "Contact", href: "#" },
  ] as const;
  const audienceTabs = ["For Associators", "For Industry Professionals", "For University"];
  const pathname = usePathname();

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
    const syncAuth = () => setIsLoggedIn(window.localStorage.getItem("sft_logged_in") === "true");
    syncAuth();
    window.addEventListener("storage", syncAuth);
    /** Same-tab login does not fire `storage`; account page dispatches this after setting session. */
    window.addEventListener("sft_auth_updated", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("sft_auth_updated", syncAuth);
    };
  }, [pathname]);

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
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    window.location.href = "/";
  };
  const isLight = theme === "light";

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-md ${
          isLight
            ? "border-[#b4965a]/45 bg-linear-to-b from-[#f8f4ec]/95 to-[#efe7da]/95 text-slate-900 shadow-[0_10px_28px_rgba(148,118,59,0.16)]"
            : "border-white/5 bg-[#0a0a0a]/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
        }`}
      >
        <div
          className={`hidden border-b md:block ${
            isLight
              ? "border-[#b4965a]/35 bg-linear-to-r from-[#efe7da] via-[#f3ede3] to-[#efe7da]"
              : "border-white/10 bg-[#0a0f1a]"
          }`}
        >
          <div className="mx-auto flex h-11 w-full max-w-[1760px] items-center gap-8 px-4 xl:px-6">
            {audienceTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveAudience(tab)}
                className={`relative px-1 py-1.5 text-sm font-semibold transition-colors ${
                  activeAudience === tab
                    ? isLight
                      ? "text-[#7a5610]"
                      : "text-amber-100"
                    : isLight
                      ? "text-slate-700 hover:text-[#7a5610]"
                      : "text-amber-100/85 hover:text-amber-50"
                }`}
              >
                <span
                  className={`pointer-events-none absolute inset-x-[-10px] bottom-[-4px] top-[-4px] -z-10 rounded-lg blur-lg ${
                    activeAudience === tab
                      ? isLight
                        ? "bg-amber-300/55"
                        : "bg-amber-400/50"
                      : isLight
                        ? "bg-amber-200/35"
                        : "bg-amber-400/28"
                  }`}
                  aria-hidden
                />
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto flex h-18 w-full max-w-[1760px] items-center justify-between gap-4 px-4 xl:px-6">
          <Link href="/" className="group flex shrink-0 cursor-pointer items-center gap-3">
            <Image
              src={isLight ? sfLightLogo : sfWhiteLogo}
              alt="Sustainable Futures Trainings"
              priority
              className="h-16 w-auto object-contain"
            />
            <div className="hidden md:block">
              <p className={`whitespace-nowrap text-lg font-extrabold tracking-tight ${goldText}`}>
                Sustainable Futures Trainings
              </p>
            </div>
          </Link>

          <div className="hidden max-w-[760px] grow items-center gap-3 md:flex">
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

          <div className="flex items-center text-[14px] font-bold">
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              className={`mr-2 hidden items-center gap-2 rounded-full border px-2 py-1 transition-colors md:inline-flex ${
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
            <div className="relative hidden md:block">
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
              <div className="flex items-center gap-2">
                <Link
                  href="/my-learning?tab=dashboard"
                  className={`relative rounded-full border p-2 transition-colors ${
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
                  className={`relative rounded-full border p-2 transition-colors ${
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    className="ml-1 h-9 w-9 overflow-hidden rounded-full border border-amber-300/60 bg-linear-to-br from-[#f9b14d] to-[#eb9422] p-px shadow-[0_0_18px_rgba(249,177,77,0.35)]"
                    aria-label="Open profile menu"
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-[#121212] text-sm font-semibold text-amber-100">
                      A
                    </span>
                  </button>
                  {isProfileOpen && (
                    <div
                      className={`absolute right-0 top-11 z-50 min-w-[150px] rounded-xl border p-1 shadow-xl ${
                        isLight
                          ? "border-[#b4965a]/45 bg-[#f6efe3]"
                          : "border-white/15 bg-[#101010]"
                      }`}
                    >
                      <Link
                        href="/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          isLight ? "text-slate-700 hover:bg-amber-100/45" : "text-gray-200 hover:bg-white/10"
                        }`}
                      >
                        Profile
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

        <div className={`hidden border-t md:block ${isLight ? "border-[#b4965a]/35" : "border-white/5"}`}>
          <div
            className={`mx-auto flex h-10 w-full max-w-[1760px] items-center gap-8 px-4 text-[13px] font-bold xl:px-6 ${
              isLight ? "text-slate-700" : "text-gray-400"
            }`}
          >
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`border-b-2 py-2 transition-colors ${
                  pathname === item.href
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
            ))}
            {isLoggedIn && (
              <Link
                href="/my-learning?tab=dashboard"
                className={`py-2 transition-colors ${isLight ? "hover:text-[#8a6412]" : "hover:text-amber-400"}`}
              >
                My Learning
              </Link>
            )}
          </div>
        </div>
        {isLoggedIn && (
          <div className={`hidden border-t md:block ${isLight ? "border-[#b4965a]/35" : "border-white/5"}`}>
            <div
              className={`mx-auto flex w-full max-w-[1760px] items-center gap-3 overflow-x-auto px-4 py-2 text-xs font-semibold xl:px-6 ${
                isLight ? "text-slate-700" : "text-gray-300"
              }`}
            >
              {myLearningMenu.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 transition-colors ${
                    isLight
                      ? "border-[#b4965a]/35 bg-[#f6efe3] hover:border-[#9a7222] hover:text-[#7a5610]"
                      : "border-white/10 bg-white/5 hover:border-amber-400/40 hover:text-amber-200"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
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
            <nav className="flex flex-col gap-6 text-lg font-medium text-gray-300">
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
                <Link href="/my-learning?tab=dashboard" onClick={() => setIsMenuOpen(false)} className="hover:text-amber-400">
                  My Learning
                </Link>
              )}
            </nav>
            {isLoggedIn && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
                  My Learning Menu
                </p>
                <div className="grid gap-2">
                  {myLearningMenu.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-200 hover:border-amber-400/40 hover:text-amber-200"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4 pt-6">
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
