import { createHash, randomInt } from "node:crypto";

function captchaSecret(): string {
  return process.env.CONTACT_CAPTCHA_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || "sft-contact-captcha";
}

function signCaptcha(a: number, b: number): string {
  return createHash("sha256").update(`${a}:${b}:${captchaSecret()}`).digest("hex");
}

export function createContactCaptcha() {
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  return {
    question: `${a} + ${b}`,
    token: signCaptcha(a, b),
  };
}

export function verifyContactCaptcha(token: string, answer: number): boolean {
  for (let a = 1; a <= 12; a++) {
    for (let b = 1; b <= 12; b++) {
      if (signCaptcha(a, b) === token && a + b === answer) return true;
    }
  }
  return false;
}
