"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

/** Learners land here after sign-in when no `redirect` query is provided. */
const DEFAULT_LEARNER_AFTER_LOGIN = "/my-learning?tab=dashboard";

/** New registrations go to checkout first (demo payment), then success links to My Learning. */
const DEFAULT_REGISTER_CHECKOUT = "/checkout?buyNow=advanced-cyber-security-professional";

const accountTypes = [
  {
    id: "individual",
    title: "Individual",
    desc: "Personal learning account for students and professionals.",
    imageSrc: "/1.png",
  },
  {
    id: "organisation",
    title: "Organisation",
    desc: "Team and company training management with shared access.",
    imageSrc: "/2.png",
  },
  {
    id: "self",
    title: "Self",
    desc: "Quick self-service access using your existing credentials.",
    imageSrc: "/3.png",
  },
] as const;

const industryTypes = ["Technology", "Finance", "Healthcare", "Education", "Manufacturing", "Other"];
const companySizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

type AccountType = (typeof accountTypes)[number]["id"];
type AuthView = "register" | "login";

export default function AccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string>(DEFAULT_LEARNER_AFTER_LOGIN);

  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>("individual");
  const [authView, setAuthView] = useState<AuthView>(mode === "login" ? "login" : "register");
  const [showAuthStep, setShowAuthStep] = useState(mode === "login");
  const [selfEmail, setSelfEmail] = useState("");
  const [selfPassword, setSelfPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const nextMode = search.get("mode");
    const nextRedirect = search.get("redirect");
    setMode(nextMode);
    setRedirectTo(nextRedirect?.trim() || DEFAULT_LEARNER_AFTER_LOGIN);
  }, []);

  useEffect(() => {
    if (mode === "login") {
      setAuthView("login");
      setShowAuthStep(true);
      return;
    }
    setAuthView("register");
    setShowAuthStep(false);
  }, [mode]);

  const isSelf = selectedAccountType === "self";

  const handleAccountTypeChange = (type: AccountType) => {
    setSelectedAccountType(type);
    if (type === "self") setAuthView("login");
    if (type !== "self") setAuthView("register");
  };

  const handleContinue = () => {
    if (selectedAccountType === "self") setAuthView("login");
    setShowAuthStep(true);
  };

  const handleAuthSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formEmail = String(
      formData.get("login_email") ?? formData.get("login_work_email") ?? "",
    )
      .trim()
      .toLowerCase();
    const formPassword = String(formData.get("login_password") ?? "").trim();

    const normalizedEmail = (selfEmail.trim().toLowerCase() || formEmail).trim();
    const passwordValue = (selfPassword.trim() || formPassword).trim();
    const isAdminLogin =
      normalizedEmail === "admin@gmail.com" &&
      (passwordValue === "admin123" || passwordValue === "admin 123");

    if (selectedAccountType === "self") {
      const emailOk = normalizedEmail === "admin@gmail.com";
      const passwordOk = passwordValue === "admin123" || passwordValue === "admin 123";
      if (!emailOk || !passwordOk) {
        setAuthError("Invalid credentials. Use admin@gmail.com and password admin123.");
        return;
      }
    }
    setAuthError("");
    window.localStorage.setItem("sft_logged_in", "true");
    window.localStorage.setItem("sft_learner_email", normalizedEmail);
    window.dispatchEvent(new Event("sft_auth_updated"));
    if (isAdminLogin) {
      window.localStorage.setItem("sft_user_role", "admin");
      router.push("/admin");
      return;
    }
    window.localStorage.setItem("sft_user_role", "learner");
    const r = redirectTo.trim();
    const registerKeepsRedirect =
      (r.startsWith("/checkout") && r.includes("buyNow=")) || r.startsWith("/tutor-led/");
    const learnerDestination =
      authView === "register" ? (registerKeepsRedirect ? redirectTo : DEFAULT_REGISTER_CHECKOUT) : redirectTo;
    router.push(learnerDestination);
  };

  const goldGradient = "bg-gradient-to-b from-[#f9b14d] to-[#eb9422]";

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="relative overflow-hidden px-6 py-10">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-8 right-8 h-60 w-60 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold md:text-4xl">Account Access</h1>
            <p className="mt-2 text-sm text-gray-300">
              Secure onboarding and authentication for your selected profile.
            </p>
          </div>

        {!showAuthStep && (
          <>
            <h2 className="bg-linear-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
              Choose your avatar and account type
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Pick one profile to continue with a futuristic access experience.
            </p>
            <div className="mt-8">
              <div className="flex flex-wrap items-start justify-center gap-5">
                {accountTypes.map((type) => {
                  const active = selectedAccountType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleAccountTypeChange(type.id)}
                      className={`relative w-full max-w-[280px] overflow-hidden rounded-3xl border p-3 text-left transition-all duration-300 md:w-[280px] ${
                        active
                          ? "border-amber-300/90 bg-amber-500/15 shadow-[0_0_45px_rgba(235,148,34,0.45)]"
                          : "border-white/15 bg-white/5 hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(235,148,34,0.2)]"
                      }`}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(235,148,34,0.35),rgba(235,148,34,0.08)_35%,transparent_70%)]"
                        aria-hidden
                      />
                      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-black/40 p-2">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,177,77,0.25),transparent_70%)]" />
                        <Image
                          src={type.imageSrc}
                          alt={`${type.title} avatar`}
                          width={420}
                          height={300}
                          className="h-56 w-full object-cover"
                        />
                      </div>
                      <div className="relative mt-3 text-center">
                        <div className="text-lg font-bold">{type.title}</div>
                        <p className="mt-1 text-xs text-gray-200">{type.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleContinue}
              className={`mt-8 rounded-full px-10 py-3.5 font-bold text-black transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}
            >
              Continue
            </button>
          </>
        )}

        {showAuthStep && (
          <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-[0_0_45px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAuthStep(false)}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm hover:border-amber-500/40"
              >
                Back
              </button>
              <button type="button" className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm hover:border-amber-500/40">
                Continue with Google
              </button>
            </div>

            {!isSelf && (
              <div className="mb-6 inline-flex rounded-full border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setAuthView("register")}
                  className={`rounded-full px-5 py-2 text-sm font-bold ${authView === "register" ? `${goldGradient} text-black` : "text-gray-300"}`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => setAuthView("login")}
                  className={`rounded-full px-5 py-2 text-sm font-bold ${authView === "login" ? `${goldGradient} text-black` : "text-gray-300"}`}
                >
                  Login
                </button>
              </div>
            )}

              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAuthSubmit}>
              {selectedAccountType === "individual" && authView === "register" && (
                <>
                  <input type="text" placeholder="Name" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="tel" placeholder="Phone Number" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="email" placeholder="Email" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="text" placeholder="Email OTP" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="password" placeholder="Password" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="password" placeholder="Retype Password" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                </>
              )}

              {selectedAccountType === "individual" && authView === "login" && (
                <>
                  <input name="login_email" type="email" placeholder="Email" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input name="login_password" type="password" placeholder="Password" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                </>
              )}

              {selectedAccountType === "organisation" && authView === "register" && (
                <>
                  <input type="text" placeholder="Name" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="tel" placeholder="Phone Number" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="text" placeholder="Company Name" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="email" placeholder="Work Email" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="email" placeholder="Email" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="text" placeholder="Email OTP" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <select className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 focus:border-amber-400/50 focus:outline-none">
                    <option value="">Industry Type</option>
                    {industryTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <select className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 focus:border-amber-400/50 focus:outline-none">
                    <option value="">Company Size</option>
                    {companySizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <input type="password" placeholder="Password" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input type="password" placeholder="Retype Password" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                </>
              )}

              {selectedAccountType === "organisation" && authView === "login" && (
                <>
                  <input name="login_work_email" type="email" placeholder="Work Email" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <input name="login_password" type="password" placeholder="Password" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                </>
              )}

              {selectedAccountType === "self" && (
                <>
                  <input
                    type="email"
                    name="login_email"
                    placeholder="Email"
                    value={selfEmail}
                    onChange={(e) => setSelfEmail(e.target.value)}
                    className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none"
                  />
                  <input
                    type="password"
                    name="login_password"
                    placeholder="Password"
                    value={selfPassword}
                    onChange={(e) => setSelfPassword(e.target.value)}
                    className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none"
                  />
                </>
              )}

              <div className="md:col-span-2">
                {authError && <p className="mb-2 text-sm text-rose-300">{authError}</p>}
                <button type="submit" className={`w-full rounded-xl px-6 py-3.5 font-bold text-black transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}>
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
