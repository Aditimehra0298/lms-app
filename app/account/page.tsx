"use client";

import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EmailOtpField from "@/components/EmailOtpField";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import Galaxy from "@/components/Galaxy";
import PasswordConfirmFields from "@/components/PasswordConfirmFields";
import PasswordField from "@/components/PasswordField";
import PhoneWithCountryCode from "@/components/PhoneWithCountryCode";
import { validateLearnerPassword } from "@/lib/password-policy";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import type { AccountTypeId, LearnerAuthProfile } from "@/lib/auth-profile";
import { cacheLearnerProfile } from "@/lib/auth-profile";
import {
  markLearnerAuthProvider,
} from "@/lib/learner-learning-preferences";
import {
  PROFILE_COMPANY_SIZE_OPTIONS,
  REGISTRATION_INDUSTRY_OPTIONS,
  profileFieldClass,
  profileLabelClass,
} from "@/lib/learner-profile-form";
import {
  GOOGLE_GSI_SCRIPT,
  getGoogleClientId,
  isGoogleOAuthReady,
  requestGoogleAccessToken,
  waitForGoogleOAuth2,
} from "@/lib/google-sign-in-client";
import {
  getBrowserOrigin,
  googleOriginMismatchHint,
  shouldShowGoogleWifiOriginHint,
} from "@/lib/google-sign-in-origin";
import { countryDisplayName } from "@/lib/iso-country-list";
import { applyGoogleSession, signInWithGoogleAccessToken } from "@/lib/learner-google-auth";
import {
  cachePricingRegion,
  cachePricingRegionFromCountryCode,
  fetchGuestPricingRegion,
  applyDbProfileToSession,
  recordLearnerAuth,
  syncLearnerProfileFromServer,
  type AuthCountryInput,
} from "@/lib/learner-session-client";
import type { LmsUserProfilePayload } from "@/lib/lms-user-types";
import { MY_LEARNING_DASHBOARD_HREF } from "@/lib/my-learning-nav";

export const dynamic = "force-dynamic";

/** Learners always land on the dashboard after sign-in or registration. */

function learnerDestinationAfterAuth(accountType: AccountType): string {
  if (accountType === "self") return "/admin";
  return MY_LEARNING_DASHBOARD_HREF;
}

/** Galaxy on every device — tuned for visibility + lighter GPU load. */
const ACCOUNT_GALAXY_PROPS_DARK = {
  mouseRepulsion: false,
  mouseInteraction: false,
  density: 1.15,
  glowIntensity: 0.55,
  saturation: 0.18,
  hueShift: 140,
  twinkleIntensity: 0.35,
  rotationSpeed: 0.1,
  repulsionStrength: 0,
  autoCenterRepulsion: 0,
  starSpeed: 0.45,
  speed: 0.85,
  transparent: true,
} as const;

const ACCOUNT_GALAXY_PROPS_LIGHT = {
  mouseRepulsion: false,
  mouseInteraction: false,
  density: 1.15,
  glowIntensity: 0.68,
  saturation: 0.72,
  hueShift: 46,
  twinkleIntensity: 0.4,
  rotationSpeed: 0.1,
  repulsionStrength: 0,
  autoCenterRepulsion: 0,
  starSpeed: 0.45,
  speed: 0.85,
  transparent: true,
} as const;

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
    title: "Admin",
    desc: "Administrator access.",
    imageSrc: "/3.png",
  },
] as const;

function RegisterSection({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="col-span-full border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">{title}</h3>
      {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-400">{description}</p> : null}
    </div>
  );
}

type AccountType = AccountTypeId;
type AuthView = "register" | "login";

function avatarForAccountType(type: AccountType): string {
  return accountTypes.find((t) => t.id === type)?.imageSrc ?? "/1.png";
}

function emailFromForm(
  formData: FormData,
  accountType: AccountType,
  authView: AuthView,
  selfEmail: string,
): string {
  if (accountType === "self") return selfEmail.trim().toLowerCase();
  if (accountType === "organisation") {
    const key = authView === "login" ? "login_work_email" : "work_email";
    return String(formData.get(key) ?? "").trim().toLowerCase();
  }
  const key = authView === "login" ? "login_email" : "email";
  return String(formData.get(key) ?? "").trim().toLowerCase();
}

function profileFromForm(
  formData: FormData,
  accountType: AccountType,
  authView: AuthView,
): LearnerAuthProfile {
  const base: LearnerAuthProfile = {
    accountType,
    avatarUrl: avatarForAccountType(accountType),
  };
  if (authView === "login") return base;

  const name = String(formData.get("name") ?? "").trim();
  if (name) base.name = name;

  const phone = String(formData.get("phone") ?? "").trim();
  if (phone) base.phone = phone;

  if (accountType === "organisation") {
    const companyName = String(formData.get("company_name") ?? "").trim();
    if (companyName) base.companyName = companyName;
    const personalEmail = String(formData.get("personal_email") ?? "").trim().toLowerCase();
    if (personalEmail) base.personalEmail = personalEmail;
    const industryType = String(formData.get("industry_type") ?? "").trim();
    if (industryType) base.industryType = industryType;
    const companySize = String(formData.get("company_size") ?? "").trim();
    if (companySize) base.companySize = companySize;
  }

  if (accountType === "individual") {
    const industryType = String(formData.get("industry_type") ?? "").trim();
    if (industryType) base.industryType = industryType;
    const companyName = String(formData.get("company_name") ?? "").trim();
    if (companyName) base.companyName = companyName;
  }

  return base;
}

function authCountryInput(countryCode: string): AuthCountryInput | undefined {
  const code = countryCode.trim().toUpperCase();
  if (!code) return undefined;
  return { countryCode: code, countryName: countryDisplayName(code) };
}

function GoogleMark({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<string | null>(null);

  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>("individual");
  const [authView, setAuthView] = useState<AuthView>(mode === "login" ? "login" : "register");
  const [showAuthStep, setShowAuthStep] = useState(mode === "login");
  const [selfEmail, setSelfEmail] = useState("");
  const [adminEmailLocked, setAdminEmailLocked] = useState(false);
  const [selfPassword, setSelfPassword] = useState("");
  const [adminVerifyToken, setAdminVerifyToken] = useState<string | null>(null);
  const [adminAwaitingGoogle, setAdminAwaitingGoogle] = useState(false);
  const adminGoogleTriggered = useRef(false);
  const [authError, setAuthError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [browserOrigin, setBrowserOrigin] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [registerCountryCode, setRegisterCountryCode] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginNotice, setLoginNotice] = useState("");
  const [adminSetupHint, setAdminSetupHint] = useState<string | null>(null);
  const [adminRequirePassword, setAdminRequirePassword] = useState(true);
  const [adminRequireGoogle, setAdminRequireGoogle] = useState(true);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [authPortalReady, setAuthPortalReady] = useState(false);
  const googleConfigured = Boolean(getGoogleClientId());

  useEffect(() => {
    setAuthPortalReady(true);
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      setIsLightTheme(document.documentElement.dataset.theme === "light");
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const nextMode = search.get("mode");
    setMode(nextMode);
    if (search.get("admin") === "1" || search.get("admin") === "true") {
      setSelectedAccountType("self");
      setAuthView("login");
      setShowAuthStep(true);
      return;
    }
    if (nextMode === "login" || nextMode === "register") {
      setAuthView(nextMode === "login" ? "login" : "register");
      setShowAuthStep(true);
    }
    const loggedIn = window.localStorage.getItem("sft_logged_in") === "true";
    const learnerEmail = window.localStorage.getItem("sft_learner_email")?.trim();
    if (loggedIn && learnerEmail) {
      router.replace(MY_LEARNING_DASHBOARD_HREF);
    }
  }, [router]);

  useEffect(() => {
    setBrowserOrigin(getBrowserOrigin());
  }, []);

  useEffect(() => {
    if (!googleConfigured || typeof window === "undefined") return;
    const ready = () => {
      if (window.google?.accounts?.oauth2) setGoogleScriptReady(true);
    };
    ready();
    const id = window.setInterval(ready, 400);
    const stop = window.setTimeout(() => window.clearInterval(id), 20_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [googleConfigured]);

  useEffect(() => {
    if (selectedAccountType !== "self" || !showAuthStep) return;
    let cancelled = false;
    void fetch("/api/auth/admin-setup", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (data: {
          mainAdminEmail?: string | null;
          googleConfigured?: boolean;
          passwordConfigured?: boolean;
          requirePanelPassword?: boolean;
          requireGoogleVerification?: boolean;
          appUrl?: string;
        }) => {
          if (cancelled) return;
          // Do not pre-fill the main admin email — learner/admin enters it themselves.
          setAdminEmailLocked(false);
          setAdminRequirePassword(data.requirePanelPassword !== false);
          setAdminRequireGoogle(Boolean(data.requireGoogleVerification));
          // Do not show developer/setup copy (email + Google Console origins) on admin login.
          // Only surface real misconfiguration that blocks sign-in.
          if (data.requirePanelPassword !== false && !data.passwordConfigured) {
            setAdminSetupHint(
              "Admin password is not set yet. Ask your developer to set the first password, or use Settings once you have access.",
            );
          } else if (data.requireGoogleVerification && !data.googleConfigured) {
            setAdminSetupHint(
              "Google verification is required, but Google sign-in is not connected yet. Contact your platform owner.",
            );
          } else {
            setAdminSetupHint(null);
          }
        },
      )
      .catch(() => {
        if (!cancelled) setAdminSetupHint(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAccountType, showAuthStep]);

  useEffect(() => {
    if (mode === "login") {
      setAuthView("login");
      setShowAuthStep(true);
      return;
    }
    if (mode === "register" || mode === "signup") {
      setAuthView("register");
      setShowAuthStep(false);
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
    setRegisterEmail("");
    setEmailOtpVerified(false);
    setAdminVerifyToken(null);
    setAdminAwaitingGoogle(false);
    adminGoogleTriggered.current = false;
    setShowForgotPassword(false);
    setLoginNotice("");
    setAuthError("");
    setShowAuthStep(true);
  };

  const closeAuthModal = () => {
    setShowAuthStep(false);
    setAuthError("");
    setAdminAwaitingGoogle(false);
    setAdminVerifyToken(null);
    adminGoogleTriggered.current = false;
  };

  useEffect(() => {
    if (authView !== "login") {
      setShowForgotPassword(false);
      setLoginNotice("");
    }
  }, [authView, selectedAccountType]);

  useEffect(() => {
    setRegisterEmail("");
    setEmailOtpVerified(false);
  }, [authView, selectedAccountType]);

  useEffect(() => {
    if (!showAuthStep) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showAuthStep]);

  useEffect(() => {
    if (!showAuthStep) return;
    let cancelled = false;
    void fetchGuestPricingRegion().then((region) => {
      if (!cancelled && region && authView === "register") {
        setRegisterCountryCode((prev) => prev || region.countryCode);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [showAuthStep, authView]);

  useEffect(() => {
    if (registerCountryCode) {
      cachePricingRegionFromCountryCode(registerCountryCode);
    }
  }, [registerCountryCode]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formPassword = String(formData.get("login_password") ?? formData.get("password") ?? "").trim();
    const passwordConfirm = String(formData.get("password_confirm") ?? "").trim();

    const formEmail = emailFromForm(formData, selectedAccountType, authView, selfEmail);
    const normalizedEmail = normalizeLearnerEmail(
      authView === "register" && selectedAccountType !== "self"
        ? registerEmail.trim().toLowerCase() || formEmail
        : formEmail,
    );
    const passwordValue = (selfPassword.trim() || formPassword).trim();
    const profile = profileFromForm(formData, selectedAccountType, authView);
    if (authView === "register" && registerPhone.trim()) {
      profile.phone = registerPhone.trim();
    }
    if (!normalizedEmail) {
      setAuthError("Email is required.");
      return;
    }

    if (authView === "register" && selectedAccountType !== "self") {
      if (!passwordValue) {
        setAuthError("Password is required.");
        return;
      }
      const passwordCheck = validateLearnerPassword(passwordValue);
      if (!passwordCheck.ok) {
        setAuthError(passwordCheck.message);
        return;
      }
      if (passwordValue !== passwordConfirm) {
        setAuthError("Passwords do not match.");
        return;
      }
      const displayName = String(formData.get("name") ?? "").trim();
      if (!displayName) {
        setAuthError("Name is required.");
        return;
      }
      if (selectedAccountType === "organisation") {
        const companyName = String(formData.get("company_name") ?? "").trim();
        if (!companyName) {
          setAuthError("Company name is required.");
          return;
        }
      }
      if (!emailOtpVerified) {
        setAuthError("Verify your email with OTP before registering (Send OTP → enter code → Verify OTP).");
        return;
      }
      if (!registerCountryCode) {
        setAuthError("Choose your country code in the mobile number field.");
        return;
      }
    }

    if (selectedAccountType === "self") {
      setAuthError("");
      if (adminRequirePassword && !passwordValue) {
        setAuthError("Admin password is required.");
        return;
      }
      try {
        const res = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password: passwordValue }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          email?: string;
          verifyToken?: string;
          requiresGoogleVerification?: boolean;
          profile?: LmsUserProfilePayload;
          role?: string;
          accountType?: string;
        };
        if (!res.ok || !data.ok) {
          setAuthError(data.message ?? "Admin sign-in failed.");
          return;
        }

        if (data.requiresGoogleVerification === false) {
          if (data.profile) {
            applyDbProfileToSession(data.profile);
          } else {
            window.localStorage.setItem("sft_learner_email", data.email ?? normalizedEmail);
            window.localStorage.setItem("sft_user_role", "admin");
          }
          window.localStorage.setItem("sft_logged_in", "true");
          setAuthError("");
          window.location.href = "/admin";
          return;
        }

        if (!data.verifyToken) {
          setAuthError(data.message ?? "Admin sign-in failed.");
          return;
        }
        const verifyToken = data.verifyToken;
        setAdminVerifyToken(verifyToken);
        setAdminAwaitingGoogle(true);
        setSelfPassword("");
        adminGoogleTriggered.current = false;
        setAuthError("");
        // Open Google in the same click as "Sign in to Admin" (avoids popup blockers).
        const openGoogleAfterPassword = (attempt = 0) => {
          if (window.google?.accounts?.oauth2) {
            setGoogleScriptReady(true);
            runAdminGoogleVerification(verifyToken);
            return;
          }
          if (attempt < 30) {
            window.setTimeout(() => openGoogleAfterPassword(attempt + 1), 200);
            return;
          }
          setAuthError(
            "Password accepted. Allow popups for localhost, then click Verify with Google.",
          );
        };
        openGoogleAfterPassword();
      } catch {
        setAuthError("Could not reach the server. Check that the app is running.");
      }
      return;
    }

    if (authView === "login") {
      if (!passwordValue) {
        setAuthError("Password is required.");
        return;
      }
      try {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password: passwordValue }),
        });
        const loginData = (await loginRes.json()) as {
          ok?: boolean;
          message?: string;
          profile?: LmsUserProfilePayload;
        };
        if (!loginRes.ok || !loginData.ok) {
          setAuthError(loginData.message ?? "Invalid email or password.");
          return;
        }
        if (loginData.profile) {
          applyDbProfileToSession(loginData.profile);
        }
      } catch {
        setAuthError("Could not reach the server. Check that the app is running.");
        return;
      }
    }

    setAuthError("");
    window.localStorage.setItem("sft_logged_in", "true");
    window.localStorage.setItem("sft_learner_email", normalizedEmail);
    if (authView === "register") {
      cacheLearnerProfile(profile);
      markLearnerAuthProvider("email");
      if (profile.companyName) {
        cacheLearnerProfile({ ...profile, companyName: profile.companyName });
      }
    } else {
      markLearnerAuthProvider("email");
    }
    try {
      const country = authView === "register" ? authCountryInput(registerCountryCode) : undefined;
      const result = await recordLearnerAuth(
        normalizedEmail,
        authView === "register" ? "register" : "login",
        profile,
        country,
        authView === "register" ? passwordValue : undefined,
      );
      if (!result.ok && authView === "register") {
        setAuthError(
          result.message ??
            "Registration failed. Verify your email OTP, then try again.",
        );
        return;
      }
      if (!result.dbSaved && authView === "register") {
        setAuthError(
          result.message ??
            result.dbError ??
            "Registration could not be saved to the database. Ensure MySQL is running, then run: npm run db:push && npm run db:generate",
        );
        return;
      }
    } catch {
      if (authView === "register") {
        setAuthError("Could not reach the server. Check that the app is running.");
        return;
      }
    }
    await syncLearnerProfileFromServer(normalizedEmail);
    window.dispatchEvent(new Event("sft_auth_updated"));
    window.localStorage.setItem("sft_user_role", "learner");
    router.push(learnerDestinationAfterAuth(selectedAccountType));
  };

  const resolveCountryForGoogle = async (): Promise<string | null> => {
    if (registerCountryCode.trim()) return registerCountryCode.trim();
    try {
      const res = await fetch("/api/geo/country", { cache: "no-store" });
      const data = (await res.json()) as { countryCode?: string };
      if (data.countryCode?.trim()) {
        setRegisterCountryCode(data.countryCode.trim().toUpperCase());
        return data.countryCode.trim().toUpperCase();
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const finishGoogleSignIn = async (accessToken: string, adminTokenOverride?: string | null) => {
    setGoogleLoading(true);
    setAuthError("");
    const verifyTokenForAdmin = adminTokenOverride ?? adminVerifyToken;
    try {
      let countryCodeForRegister: string | null = null;
      if (authView === "register" && selectedAccountType !== "self") {
        countryCodeForRegister = await resolveCountryForGoogle();
        if (!countryCodeForRegister) {
          setAuthError(
            "Choose your country code in the mobile field, or allow location detection, before Google sign-in.",
          );
          setGoogleLoading(false);
          return;
        }
      }
      const country =
        authView === "register" && selectedAccountType !== "self" && countryCodeForRegister
          ? authCountryInput(countryCodeForRegister)
          : undefined;
      const result = await signInWithGoogleAccessToken(
        accessToken,
        selectedAccountType,
        selectedAccountType === "self" ? "login" : authView,
        country,
        selectedAccountType === "self" ? verifyTokenForAdmin : undefined,
      );
      if (!result.ok) {
        adminGoogleTriggered.current = false;
        setAuthError(result.message ?? "Google sign-in failed.");
        return;
      }
      if (!result.dbSaved && authView === "register") {
        setAuthError(
          "Google sign-in succeeded but could not save to the database. Ensure MySQL is running, then run: npm run db:push",
        );
        return;
      }
      if (selectedAccountType === "self" && result.role !== "admin") {
        adminGoogleTriggered.current = false;
        setAuthError(
          result.message ??
            `Only ${selfEmail || "the main admin Gmail"} can open the admin panel. Sign in with that Google account.`,
        );
        return;
      }
      const session = applyGoogleSession(result, selectedAccountType);
      if (!session) {
        setAuthError("Google sign-in did not return a valid session.");
        return;
      }
      if (session.role === "admin") {
        setAdminVerifyToken(null);
        setAdminAwaitingGoogle(false);
        adminGoogleTriggered.current = false;
        router.push("/admin");
        return;
      }
      router.push(learnerDestinationAfterAuth(result.accountType ?? selectedAccountType));
    } catch {
      setAuthError("Could not reach the server. Check that the app is running.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const runAdminGoogleVerification = (verifyTokenOverride?: string | null) => {
    const verifyToken = verifyTokenOverride ?? adminVerifyToken;
    if (!googleConfigured) {
      setAuthError(
        "Configure GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local, then restart the dev server.",
      );
      return;
    }
    if (!isGoogleOAuthReady()) {
      setAuthError("Google sign-in is still loading. Wait a moment and try again.");
      return;
    }
    setGoogleScriptReady(true);
    if (!verifyToken) {
      setAuthError("Enter your admin email and password first.");
      return;
    }
    const adminGoogleEmail = selfEmail.trim().toLowerCase();
    if (!adminGoogleEmail) {
      setAuthError("Admin email is required.");
      return;
    }
    requestGoogleAccessToken(
      (token) => {
        void finishGoogleSignIn(token, verifyToken);
      },
      (message) => {
        adminGoogleTriggered.current = false;
        setAuthError(googleOriginMismatchHint(message, getBrowserOrigin()));
      },
      { loginHint: adminGoogleEmail, prompt: "" },
    );
  };

  const handleGoogleSignIn = () => {
    void (async () => {
      if (selectedAccountType === "self") {
        if (!adminVerifyToken) {
          setAuthError("Enter admin email and password first.");
          return;
        }
        runAdminGoogleVerification();
        return;
      }
      if (!googleConfigured) {
        setAuthError(
          "Google sign-in is not configured. Add GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local, then restart the dev server. See docs/GOOGLE_SIGNIN.md.",
        );
        return;
      }
      setGoogleLoading(true);
      setAuthError("");
      const sdkReady =
        googleScriptReady || isGoogleOAuthReady() || (await waitForGoogleOAuth2());
      if (sdkReady) setGoogleScriptReady(true);
      if (!sdkReady) {
        setGoogleLoading(false);
        setAuthError(
          `Google sign-in is still loading. Check your connection, disable ad blockers for this page, then try again.`,
        );
        return;
      }
      requestGoogleAccessToken(
        (token) => {
          void finishGoogleSignIn(token);
        },
        (message) => {
          setGoogleLoading(false);
          setAuthError(googleOriginMismatchHint(message, getBrowserOrigin()));
        },
        undefined,
      );
    })();
  };

  const goldGradient = "bg-gradient-to-b from-[#f9b14d] to-[#eb9422]";
  const accountGalaxyProps = isLightTheme ? ACCOUNT_GALAXY_PROPS_LIGHT : ACCOUNT_GALAXY_PROPS_DARK;

  return (
    <div className="account-page relative isolate flex w-full flex-1 flex-col bg-[#070707] text-white">
      {googleConfigured && (
        <Script
          src={GOOGLE_GSI_SCRIPT}
          strategy="afterInteractive"
          onLoad={() => {
            setGoogleScriptReady(true);
            void waitForGoogleOAuth2(5000).then((ok) => {
              if (ok) setGoogleScriptReady(true);
            });
          }}
          onError={() => {
            setAuthError(
              `Could not load Google sign-in. Check your internet connection and try again.`,
            );
          }}
        />
      )}
      {/* CSS starfield underlay — visible instantly; WebGL galaxy on top for all devices */}
      <div
        className="account-galaxy-fallback pointer-events-none absolute inset-0 z-0 min-h-full w-full overflow-hidden"
        aria-hidden
      >
        <span className="account-galaxy-layer account-galaxy-layer--a" />
        <span className="account-galaxy-layer account-galaxy-layer--b" />
        <span className="account-galaxy-layer account-galaxy-layer--c" />
        <span className="account-galaxy-glow" />
      </div>
      <Galaxy
        key={isLightTheme ? "account-galaxy-light" : "account-galaxy-dark"}
        className="account-galaxy pointer-events-none absolute inset-0 z-[1] min-h-full w-full"
        aria-hidden
        {...accountGalaxyProps}
      />
      <main className="relative z-10 w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <div className="relative mx-auto w-full max-w-[1760px]">
          <div className="mx-auto flex w-full max-w-6xl flex-col py-4 md:py-10">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                Get started
              </p>
              <h2 className="account-hero-title mt-2 bg-linear-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                Choose your avatar
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-gray-300">
                Select a profile. Register and login open in a popup on this page.
              </p>
            </div>
            <div className="mt-8">
              <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {accountTypes.map((type) => {
                  const active = selectedAccountType === type.id && showAuthStep;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleAccountTypeChange(type.id)}
                      className={`account-type-card group relative w-full overflow-hidden rounded-[1.75rem] border p-3.5 text-left transition-all duration-300 ${
                        active
                          ? "border-amber-300/90 bg-amber-500/15 shadow-[0_0_45px_rgba(235,148,34,0.45)]"
                          : "border-white/15 bg-white/[0.04] hover:-translate-y-1 hover:border-amber-500/45 hover:shadow-[0_0_34px_rgba(235,148,34,0.22)]"
                      }`}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(235,148,34,0.32),rgba(235,148,34,0.06)_35%,transparent_70%)]"
                        aria-hidden
                      />
                      <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-amber-500/20 bg-black/45 p-2 sm:h-48 lg:h-52">
                        <div
                          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,177,77,0.22),transparent_70%)]"
                          aria-hidden
                        />
                        <Image
                          src={type.imageSrc}
                          alt={`${type.title} avatar`}
                          width={420}
                          height={300}
                          className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      </div>
                      <div className="relative mt-4 text-center">
                        <div className="text-lg font-bold tracking-tight">{type.title}</div>
                        <p className="mt-1.5 text-xs leading-relaxed text-gray-300">{type.desc}</p>
                        <span
                          className={`mt-4 inline-flex min-w-[10.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-bold text-black shadow-[0_8px_24px_rgba(235,148,34,0.35)] transition ${goldGradient} group-hover:-translate-y-0.5 group-hover:brightness-110 ${
                            active ? "ring-2 ring-amber-200/80" : ""
                          }`}
                        >
                          {active ? "Opened" : "Tap to continue"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {authPortalReady &&
            showAuthStep &&
            createPortal(
              <div
                className="account-auth-overlay fixed inset-0 flex items-start justify-center overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-8"
                style={{ zIndex: 100000 }}
                role="presentation"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closeAuthModal();
                }}
              >
                <div
                  className="pointer-events-none fixed inset-0 bg-black/45 backdrop-blur-[3px]"
                  aria-hidden
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="account-auth-modal-title"
                  className="account-auth-panel relative my-auto w-full max-w-3xl rounded-[1.75rem] border border-amber-400/30 bg-gradient-to-b from-[#14110c] via-[#0c0c0c] to-[#080808] shadow-[0_25px_80px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-32 rounded-t-[1.75rem] bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.18),transparent_70%)]"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={closeAuthModal}
                    className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/55 text-sm text-gray-200 transition hover:border-amber-400/50 hover:bg-amber-500/15 hover:text-white"
                    aria-label="Close"
                  >
                    ✕
                  </button>

                <div className="relative border-b border-white/10 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
                  <div className="flex items-start gap-4 pr-10">
                    <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl border border-amber-400/35 bg-black/40 shadow-[0_0_24px_rgba(245,158,11,0.2)]">
                      <Image
                        src={avatarForAccountType(selectedAccountType)}
                        alt="Selected avatar"
                        width={72}
                        height={72}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/85">
                        Selected profile
                      </p>
                      <h2
                        id="account-auth-modal-title"
                        className="mt-1 text-2xl font-bold capitalize tracking-tight text-white"
                      >
                        {selectedAccountType === "self" ? "Admin" : selectedAccountType}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                        {isSelf
                          ? "Sign in to open the admin control panel."
                          : "Create an account or sign in. You can update profile details later."}
                      </p>
                    </div>
                  </div>

                  {!isSelf ? (
                    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                      <div className="inline-flex w-full rounded-2xl border border-white/10 bg-black/35 p-1">
                        <button
                          type="button"
                          onClick={() => setAuthView("register")}
                          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                            authView === "register"
                              ? `${goldGradient} text-black shadow-sm`
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          Register
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthView("login");
                            setShowForgotPassword(false);
                          }}
                          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                            authView === "login"
                              ? `${goldGradient} text-black shadow-sm`
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          Login
                        </button>
                      </div>
                      {!showForgotPassword && googleConfigured ? (
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={googleLoading || !googleScriptReady}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <GoogleMark />
                          <span className="whitespace-nowrap">
                            {googleLoading
                              ? "Signing in…"
                              : !googleScriptReady
                                ? "Loading…"
                                : "Google"}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="relative px-5 py-5 sm:px-7 sm:py-6">
            {browserOrigin &&
            !isSelf &&
            shouldShowGoogleWifiOriginHint(browserOrigin) &&
            googleConfigured ? (
              <p className="mb-4 rounded-xl border border-sky-400/35 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                <strong className="text-sky-200">Wi‑Fi login:</strong> Google must allow this exact address — add{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-sky-50">{browserOrigin}</code> in{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-sky-200"
                >
                  Google Cloud → Credentials
                </a>{" "}
                → your OAuth client → <strong>Authorized JavaScript origins</strong> (keep{" "}
                <code className="text-xs">http://localhost:3000</code> too). Save, wait ~1 minute, refresh this page.
              </p>
            ) : null}

            {isSelf && adminAwaitingGoogle && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminAwaitingGoogle(false);
                    setAdminVerifyToken(null);
                    adminGoogleTriggered.current = false;
                    setAuthError("");
                  }}
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm hover:border-amber-500/40"
                >
                  Back
                </button>
                {googleConfigured && (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || !googleScriptReady}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/20 px-4 py-2 text-sm text-amber-50 hover:border-amber-300 disabled:opacity-60"
                  >
                    <GoogleMark />
                    {googleLoading ? "Signing in…" : "Continue with Google"}
                  </button>
                )}
              </div>
            )}
            {isSelf && adminAwaitingGoogle && (
              <div className="mb-6 space-y-3">
                <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <strong className="text-amber-200">Step 2 — Google:</strong>{" "}
                  {selfEmail.trim()
                    ? <>Continue with Google using <strong>{selfEmail.trim()}</strong>.</>
                    : <>Continue with Google using your admin Gmail account.</>}
                </p>
                {authError ? <p className="text-sm text-rose-300">{authError}</p> : null}
                {googleConfigured ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || !googleScriptReady}
                    className={`flex w-full items-center justify-center gap-3 rounded-xl border border-amber-400/50 px-6 py-3.5 text-base font-semibold text-amber-50 shadow-[0_0_24px_rgba(245,158,11,0.2)] ${goldGradient} !text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <GoogleMark />
                    {googleLoading
                      ? "Signing in with Google…"
                      : !googleScriptReady
                        ? "Loading Google…"
                        : "Continue with Google"}
                  </button>
                ) : (
                  <p className="text-sm text-rose-300">Google sign-in is not configured.</p>
                )}
              </div>
            )}

              <form className="grid gap-4 overflow-visible sm:grid-cols-2" onSubmit={handleAuthSubmit}>
              {selectedAccountType === "individual" && authView === "register" && (
                <>
                  <RegisterSection
                    title="Account details"
                    description="Your login email must be verified with OTP before you can register."
                  />
                  <label className="block">
                    <span className={profileLabelClass}>Full name</span>
                    <input name="name" type="text" required placeholder="Your full name" className={profileFieldClass} />
                  </label>
                  <div>
                    <span className={profileLabelClass}>Mobile number</span>
                    <PhoneWithCountryCode
                      countryCode={registerCountryCode}
                      onCountryChange={setRegisterCountryCode}
                      onPhoneChange={setRegisterPhone}
                    />
                  </div>
                  <div className="col-span-full">
                    <EmailOtpField
                      email={registerEmail}
                      onEmailChange={setRegisterEmail}
                      emailInputName="email"
                      emailPlaceholder="Email address"
                      verified={emailOtpVerified}
                      onVerifiedChange={setEmailOtpVerified}
                    />
                  </div>

                  <div className="col-span-full">
                    <PasswordConfirmFields />
                  </div>
                </>
              )}

              {selectedAccountType === "individual" && authView === "login" && showForgotPassword && (
                <ForgotPasswordForm
                  accountType="individual"
                  onBackToLogin={() => {
                    setShowForgotPassword(false);
                    setAuthError("");
                  }}
                  onSuccess={() => {
                    setShowForgotPassword(false);
                    setAuthError("");
                    setLoginNotice("Password updated. Sign in with your new password.");
                    setAuthView("login");
                  }}
                />
              )}

              {selectedAccountType === "individual" && authView === "login" && !showForgotPassword && (
                <>
                  <input name="login_email" type="email" placeholder="Email" required className="col-span-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none sm:col-span-1" />
                  <div className="col-span-full space-y-2 sm:col-span-1">
                    <PasswordField name="login_password" placeholder="Password" autoComplete="current-password" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setAuthError("");
                      }}
                      className="text-sm text-amber-200/90 hover:text-amber-100 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              )}

              {selectedAccountType === "organisation" && authView === "register" && (
                <>
                  <RegisterSection
                    title="Account details"
                    description="Organisation accounts manage team training. Work email must be verified with OTP."
                  />
                  <label className="block">
                    <span className={profileLabelClass}>Contact name</span>
                    <input name="name" type="text" required placeholder="Your name" className={profileFieldClass} />
                  </label>
                  <div>
                    <span className={profileLabelClass}>Mobile number</span>
                    <PhoneWithCountryCode
                      countryCode={registerCountryCode}
                      onCountryChange={setRegisterCountryCode}
                      onPhoneChange={setRegisterPhone}
                    />
                  </div>
                  <label className="block col-span-full">
                    <span className={profileLabelClass}>Company name</span>
                    <input name="company_name" type="text" required placeholder="Legal company name" className={profileFieldClass} />
                  </label>
                  <div className="col-span-full">
                    <EmailOtpField
                      email={registerEmail}
                      onEmailChange={setRegisterEmail}
                      emailInputName="work_email"
                      emailPlaceholder="Work email"
                      verified={emailOtpVerified}
                      onVerifiedChange={setEmailOtpVerified}
                    />
                  </div>
                  <label className="block">
                    <span className={profileLabelClass}>Personal email</span>
                    <input name="personal_email" type="email" placeholder="Optional backup email" className={profileFieldClass} />
                  </label>

                  <RegisterSection title="Organisation profile" />
                  <label className="block">
                    <span className={profileLabelClass}>Industry</span>
                    <select name="industry_type" className={profileFieldClass}>
                      <option value="">Select industry</option>
                      {REGISTRATION_INDUSTRY_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={profileLabelClass}>Company size</span>
                    <select name="company_size" className={profileFieldClass}>
                      <option value="">Select size</option>
                      {PROFILE_COMPANY_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size} employees
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="col-span-full">
                    <PasswordConfirmFields />
                  </div>
                </>
              )}

              {selectedAccountType === "organisation" && authView === "login" && showForgotPassword && (
                <ForgotPasswordForm
                  accountType="organisation"
                  onBackToLogin={() => {
                    setShowForgotPassword(false);
                    setAuthError("");
                  }}
                  onSuccess={() => {
                    setShowForgotPassword(false);
                    setAuthError("");
                    setLoginNotice("Password updated. Sign in with your new password.");
                    setAuthView("login");
                  }}
                />
              )}

              {selectedAccountType === "organisation" && authView === "login" && !showForgotPassword && (
                <>
                  <input name="login_work_email" type="email" placeholder="Work Email" required className="col-span-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none sm:col-span-1" />
                  <div className="col-span-full space-y-2 sm:col-span-1">
                    <PasswordField name="login_password" placeholder="Password" autoComplete="current-password" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setAuthError("");
                      }}
                      className="text-sm text-amber-200/90 hover:text-amber-100 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              )}

              {isSelf && !adminAwaitingGoogle && (
                <>
                  {adminSetupHint ? (
                    <p className="col-span-full text-xs text-amber-200/80">{adminSetupHint}</p>
                  ) : null}
                  {adminRequireGoogle && !googleConfigured && (
                    <p className="col-span-full text-sm text-rose-300">
                      Google verification is turned on, but Google sign-in is not connected yet. Contact your
                      platform owner.
                    </p>
                  )}
                  <input
                    type="email"
                    name="admin_email"
                    placeholder="Admin email"
                    value={selfEmail}
                    onChange={(e) => setSelfEmail(e.target.value)}
                    readOnly={adminEmailLocked}
                    autoComplete="username"
                    required
                    className={`col-span-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none ${adminEmailLocked ? "cursor-default text-amber-100/90" : ""}`}
                  />
                  {adminRequirePassword ? (
                    <PasswordField
                      name="admin_password"
                      placeholder="Admin password"
                      value={selfPassword}
                      onChange={setSelfPassword}
                      autoComplete="current-password"
                      className="col-span-full"
                    />
                  ) : null}
                  <div className="col-span-full">
                    {!adminAwaitingGoogle && authError && (
                      <p className="mb-2 text-sm text-rose-300">{authError}</p>
                    )}
                    <button
                      type="submit"
                      className={`w-full rounded-xl px-6 py-3.5 font-bold text-black transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}
                    >
                      Sign in to Admin
                    </button>
                  </div>
                  {adminRequireGoogle && googleConfigured && (
                    <div className="col-span-full">
                      <div className="my-1 flex items-center gap-3">
                        <span className="h-px flex-1 bg-white/10" aria-hidden />
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">or</span>
                        <span className="h-px flex-1 bg-white/10" aria-hidden />
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading || !googleScriptReady}
                        className="mt-2 flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-base font-semibold text-white hover:border-amber-400/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <GoogleMark className="h-5 w-5" />
                        {googleLoading
                          ? "Signing in with Google…"
                          : !googleScriptReady
                            ? "Loading Google…"
                            : "Continue with Google"}
                      </button>
                    </div>
                  )}
                </>
              )}

              {!isSelf && !(authView === "login" && showForgotPassword) && (
                <div className="col-span-full pt-1">
                  {loginNotice && authView === "login" && (
                    <p className="mb-2 text-sm text-emerald-300">{loginNotice}</p>
                  )}
                  {authError && <p className="mb-2 text-sm text-rose-300">{authError}</p>}
                  <button
                    type="submit"
                    className={`w-full rounded-xl px-6 py-3.5 font-bold text-black transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}
                  >
                    {authView === "login" ? "Sign in" : "Create account"}
                  </button>
                </div>
              )}

            </form>
                </div>
              </div>
            </div>,
              document.body,
            )}
        </div>
      </main>
    </div>
  );
}
