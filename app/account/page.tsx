"use client";

import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  LEARNING_GOAL_OPTIONS,
  LEARNING_INTEREST_OPTIONS,
  markLearnerAuthProvider,
  seedPreferencesFromProfile,
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
  googleOriginSetupHint,
  isLanOrNonLocalhostOrigin,
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

export const dynamic = "force-dynamic";

/** Learners land here after sign-in when no `redirect` query is provided. */
const DEFAULT_LEARNER_AFTER_LOGIN = "/";

/** New registrations go to checkout first (demo payment), then success links to My Learning. */
const DEFAULT_REGISTER_CHECKOUT = "/checkout?buyNow=advanced-cyber-security-professional";

/** Stable props so Galaxy WebGL is not re-initialized on every keystroke. */
const ACCOUNT_GALAXY_PROPS = {
  mouseRepulsion: false,
  mouseInteraction: false,
  density: 1.2,
  glowIntensity: 0.55,
  saturation: 0.15,
  hueShift: 140,
  twinkleIntensity: 0.35,
  rotationSpeed: 0.1,
  repulsionStrength: 2,
  autoCenterRepulsion: 0,
  starSpeed: 0.5,
  speed: 1,
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
    <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold uppercase tracking-wide text-amber-200">{title}</h3>
      {description ? <p className="mt-1 text-xs text-gray-400">{description}</p> : null}
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
  const [redirectTo, setRedirectTo] = useState<string>(DEFAULT_LEARNER_AFTER_LOGIN);

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
  const googleConfigured = Boolean(getGoogleClientId());

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const nextMode = search.get("mode");
    const nextRedirect = search.get("redirect");
    setMode(nextMode);
    setRedirectTo(nextRedirect?.trim() || DEFAULT_LEARNER_AFTER_LOGIN);
    if (search.get("admin") === "1" || search.get("admin") === "true") {
      setSelectedAccountType("self");
      setAuthView("login");
      setShowAuthStep(true);
    }
  }, []);

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
          appUrl?: string;
        }) => {
          if (cancelled) return;
          if (data.mainAdminEmail) {
            setSelfEmail(data.mainAdminEmail);
            setAdminEmailLocked(true);
          }
          if (!data.passwordConfigured) {
            setAdminSetupHint("Set ADMIN_PASSWORD in .env.local and restart npm run dev.");
          } else if (!data.googleConfigured) {
            setAdminSetupHint(
              "Set GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local, then restart.",
            );
          } else {
            const origin = getBrowserOrigin() || data.appUrl || "http://localhost:3000";
            setAdminSetupHint(
              `Google must use only ${data.mainAdminEmail ?? "(MAIN_ADMIN_EMAIL)"}. ${googleOriginSetupHint(origin)}`,
            );
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

  const handleContinue = () => {
    if (selectedAccountType === "self") setAuthView("login");
    setShowAuthStep(true);
  };

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
      if (!passwordValue) {
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
        };
        if (!res.ok || !data.ok || !data.verifyToken) {
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
    cacheLearnerProfile(profile);
    if (authView === "register") {
      markLearnerAuthProvider("email");
      seedPreferencesFromProfile({
        industryType: profile.industryType,
        learningInterest: String(formData.get("learning_interest") ?? "").trim(),
        learningGoal: String(formData.get("learning_goal") ?? "").trim(),
      });
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
    const r = redirectTo.trim();
    const registerKeepsRedirect =
      (r.startsWith("/checkout") && r.includes("buyNow=")) || r.startsWith("/tutor-led/");
    const learnerDestination =
      authView === "register" ? (registerKeepsRedirect ? redirectTo : DEFAULT_REGISTER_CHECKOUT) : redirectTo;
    router.push(learnerDestination);
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
      const r = redirectTo.trim();
      const registerKeepsRedirect =
        (r.startsWith("/checkout") && r.includes("buyNow=")) || r.startsWith("/tutor-led/");
      const learnerDestination =
        authView === "register" ? (registerKeepsRedirect ? redirectTo : DEFAULT_REGISTER_CHECKOUT) : redirectTo;
      router.push(learnerDestination);
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
          `Google sign-in is still loading. Check your connection, disable ad blockers for this page, then try again. ${googleOriginSetupHint(getBrowserOrigin())}`,
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

  return (
    <div className="relative isolate overflow-x-hidden bg-[#070707] text-white">
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
              `Could not load Google sign-in. Check your internet connection. ${googleOriginSetupHint(getBrowserOrigin())}`,
            );
          }}
        />
      )}
      <Galaxy
        className="pointer-events-none absolute inset-0 z-0 min-h-full w-full"
        aria-hidden
        {...ACCOUNT_GALAXY_PROPS}
      />
      <main className="relative z-10 w-full px-4 pt-4 pb-6 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1760px]">
        {!showAuthStep && (
          <>
            <div className="text-center">
              <h2 className="bg-linear-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
                Choose your avatar and account type
              </h2>
              <p className="mt-1 text-sm text-gray-300">
                Pick one profile to continue with a futuristic access experience.
              </p>
            </div>
            <div className="mt-4">
              <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3 xl:gap-6">
                {accountTypes.map((type) => {
                  const active = selectedAccountType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleAccountTypeChange(type.id)}
                      className={`relative w-full overflow-hidden rounded-3xl border p-3 text-left transition-all duration-300 ${
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
                        <div
                          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,177,77,0.25),transparent_70%)]"
                          aria-hidden
                        />
                        <Image
                          src={type.imageSrc}
                          alt={`${type.title} avatar`}
                          width={420}
                          height={300}
                          className="relative h-56 w-full object-cover"
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
            <div className="mt-4 flex justify-center pb-1">
              <button
                type="button"
                onClick={handleContinue}
                className={`rounded-full px-10 py-3.5 font-bold text-black transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {showAuthStep && (
          <div className="mx-auto w-full overflow-visible rounded-3xl border border-white/15 bg-black/65 p-5 shadow-[0_0_45px_rgba(0,0,0,0.45)] sm:p-6 md:p-8 xl:p-10">
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-amber-500/30">
                <Image
                  src={avatarForAccountType(selectedAccountType)}
                  alt="Selected avatar"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-200/80">Selected profile</p>
                <p className="text-lg font-bold capitalize">{selectedAccountType}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Edit organisation, industry & learning preferences anytime under Profile & settings.
                </p>
              </div>
            </div>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAuthStep(false)}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm hover:border-amber-500/40"
              >
                Back
              </button>
            </div>

            {browserOrigin && isLanOrNonLocalhostOrigin(browserOrigin) && googleConfigured ? (
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

            <div className="mb-6 flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
              {!isSelf && (
                <div className="inline-flex shrink-0 rounded-full border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => setAuthView("register")}
                    className={`rounded-full px-4 py-2 text-sm font-bold sm:px-5 ${authView === "register" ? `${goldGradient} text-black` : "text-gray-300"}`}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView("login");
                      setShowForgotPassword(false);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-bold sm:px-5 ${authView === "login" ? `${goldGradient} text-black` : "text-gray-300"}`}
                  >
                    Login
                  </button>
                </div>
              )}
              {isSelf && adminAwaitingGoogle && (
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
              )}
              {isSelf && googleConfigured && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || !googleScriptReady}
                  title={
                    !adminAwaitingGoogle
                      ? "Complete Sign in to Admin first, or use this after password is accepted"
                      : undefined
                  }
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm sm:px-4 ${
                    adminAwaitingGoogle
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-50 hover:border-amber-300"
                      : "border-white/20 bg-white/5 text-gray-200 hover:border-amber-500/40"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <GoogleMark />
                  <span className="whitespace-nowrap">
                    {googleLoading ? "Signing in…" : "Continue with Google"}
                  </span>
                </button>
              )}
              {!isSelf && !showForgotPassword && googleConfigured && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || !googleScriptReady}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm hover:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                >
                  <GoogleMark />
                  <span className="whitespace-nowrap">
                    {googleLoading
                      ? "Signing in…"
                      : !googleScriptReady
                        ? "Loading Google…"
                        : "Continue with Google"}
                  </span>
                </button>
              )}
            </div>
            {isSelf && adminAwaitingGoogle && (
              <div className="mb-6 space-y-3">
                <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <strong className="text-amber-200">Step 2 — Google:</strong> Choose only{" "}
                  <strong>{selfEmail || "social.sftrainings@gmail.com"}</strong>. Other accounts will be rejected.
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
                  <p className="text-sm text-rose-300">Google sign-in is not configured in .env.local.</p>
                )}
              </div>
            )}

              <form className="grid gap-4 overflow-visible sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5" onSubmit={handleAuthSubmit}>
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
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    <EmailOtpField
                      email={registerEmail}
                      onEmailChange={setRegisterEmail}
                      emailInputName="email"
                      emailPlaceholder="Email address"
                      verified={emailOtpVerified}
                      onVerifiedChange={setEmailOtpVerified}
                    />
                  </div>

                  <RegisterSection
                    title="Work & learning profile"
                    description="Optional — we use this to recommend the right LMS courses on your dashboard."
                  />
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
                    <span className={profileLabelClass}>Organisation you work for</span>
                    <input
                      name="company_name"
                      type="text"
                      placeholder="Company or employer name"
                      className={profileFieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className={profileLabelClass}>Primary learning interest</span>
                    <select name="learning_interest" className={profileFieldClass}>
                      <option value="">Select interest</option>
                      {LEARNING_INTEREST_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={profileLabelClass}>Learning goal</span>
                    <select name="learning_goal" className={profileFieldClass}>
                      <option value="">Select goal</option>
                      {LEARNING_GOAL_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>

                  <RegisterSection title="Security" description="Choose a strong password for your account." />
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
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
                  <input name="login_email" type="email" placeholder="Email" required className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <div className="space-y-2">
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
                  <label className="block sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    <span className={profileLabelClass}>Company name</span>
                    <input name="company_name" type="text" required placeholder="Legal company name" className={profileFieldClass} />
                  </label>
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
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

                  <RegisterSection title="Security" />
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
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
                  <input name="login_work_email" type="email" placeholder="Work Email" required className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none" />
                  <div className="space-y-2">
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
                  <p className="text-sm text-amber-100/90 md:col-span-2">
                    <strong className="text-amber-200">Admin Google account:</strong>{" "}
                    <strong className="text-amber-200">{selfEmail || "social.sftrainings@gmail.com"}</strong> only.
                    Enter password → <strong className="text-amber-200">Sign in to Admin</strong> →{" "}
                    <strong className="text-amber-200">Continue with Google</strong> (that account only).
                  </p>
                  {adminSetupHint ? (
                    <p className="text-xs text-amber-200/80 md:col-span-2">{adminSetupHint}</p>
                  ) : null}
                  {!googleConfigured && (
                    <p className="text-sm text-rose-300 md:col-span-2">
                      Google sign-in is not configured. Add{" "}
                      <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
                      <code className="text-xs">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to{" "}
                      <code className="text-xs">.env.local</code>, then restart{" "}
                      <code className="text-xs">npm run dev</code>. Also add{" "}
                      <code className="text-xs">
                        {browserOrigin || "http://localhost:3000"}
                      </code>{" "}
                      and <code className="text-xs">http://localhost:3000</code> in Google Cloud → Authorized
                      JavaScript origins.
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
                    className={`rounded-xl border border-white/15 bg-black/40 px-4 py-3 placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none md:col-span-2 ${adminEmailLocked ? "cursor-default text-amber-100/90" : ""}`}
                  />
                  <PasswordField
                    name="admin_password"
                    placeholder="Admin password"
                    value={selfPassword}
                    onChange={setSelfPassword}
                    autoComplete="current-password"
                    className="md:col-span-2"
                  />
                  <div className="md:col-span-2">
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
                  {googleConfigured && (
                    <div className="md:col-span-2">
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
                      <p className="mt-2 text-center text-xs text-gray-400">
                        Use after <strong className="text-gray-300">Sign in to Admin</strong> (same Gmail as above).
                      </p>
                    </div>
                  )}
                </>
              )}

              {!isSelf && !(authView === "login" && showForgotPassword) && (
                <div className="md:col-span-2">
                  {loginNotice && authView === "login" && (
                    <p className="mb-2 text-sm text-emerald-300">{loginNotice}</p>
                  )}
                  {authError && <p className="mb-2 text-sm text-rose-300">{authError}</p>}
                  <button
                    type="submit"
                    className={`w-full rounded-xl px-6 py-3.5 font-bold text-black transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}
                  >
                    {authView === "login" ? "Sign in" : "Submit"}
                  </button>
                </div>
              )}

            </form>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
