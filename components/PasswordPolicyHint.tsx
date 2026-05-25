"use client";

import { PASSWORD_POLICY_RULES, checkPasswordPolicy } from "@/lib/password-policy";

type Props = {
  password?: string;
  /** When true, rules turn green as the user types. When false, show static instructions only. */
  live?: boolean;
};

export default function PasswordPolicyHint({ password = "", live = false }: Props) {
  const policy = live ? checkPasswordPolicy(password) : null;

  return (
    <div
      className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3"
      role="note"
      aria-label="Password requirements"
    >
      <p className="text-sm font-semibold text-amber-100">Password must include:</p>
      <ul className="mt-2 space-y-1.5 text-xs text-amber-100/90">
        {PASSWORD_POLICY_RULES.map((rule) => {
          const met = live && policy ? policy[rule.key] : false;
          return (
            <li
              key={rule.key}
              className={live ? (met ? "text-emerald-400" : "text-gray-300") : "text-gray-300"}
            >
              {live ? (met ? "✓ " : "• ") : "• "}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
