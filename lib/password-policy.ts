export const PASSWORD_MIN_LENGTH = 8;

export type PasswordPolicyCheck = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

export const PASSWORD_POLICY_RULES = [
  { key: "minLength" as const, label: `At least ${PASSWORD_MIN_LENGTH} characters` },
  { key: "uppercase" as const, label: "One uppercase letter (A–Z)" },
  { key: "lowercase" as const, label: "One lowercase letter (a–z)" },
  { key: "number" as const, label: "One number (0–9)" },
  { key: "special" as const, label: "One special character (!@#$…)" },
];

export function checkPasswordPolicy(password: string): PasswordPolicyCheck {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordPolicyMet(check: PasswordPolicyCheck): boolean {
  return (
    check.minLength && check.uppercase && check.lowercase && check.number && check.special
  );
}

export function validateLearnerPassword(
  password: string,
): { ok: true } | { ok: false; message: string } {
  if (!password.trim()) {
    return { ok: false, message: "Password is required." };
  }
  if (!isPasswordPolicyMet(checkPasswordPolicy(password))) {
    return {
      ok: false,
      message:
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
    };
  }
  return { ok: true };
}
