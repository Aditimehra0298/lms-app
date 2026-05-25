import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";

export type SendOtpResult = { sent: boolean; devLogged?: boolean };

function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

function nodemailerInstalled(): boolean {
  return existsSync(join(process.cwd(), "node_modules", "nodemailer", "package.json"));
}

/** Real SMTP: enabled unless explicitly OTP_USE_SMTP=false. */
function useRealSmtp(): boolean {
  return process.env.OTP_USE_SMTP !== "false" && smtpConfigured();
}

type NodemailerModule = {
  createTransport: (opts: Record<string, unknown>) => {
    sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
  };
};

let nodemailerModule: NodemailerModule | null | undefined;

function loadNodemailer(): NodemailerModule | null {
  if (nodemailerModule !== undefined) return nodemailerModule;
  if (!nodemailerInstalled()) {
    nodemailerModule = null;
    return null;
  }
  try {
    const req = createRequire(join(process.cwd(), "package.json"));
    nodemailerModule = req("nodemailer") as NodemailerModule;
  } catch {
    nodemailerModule = null;
  }
  return nodemailerModule;
}

function logDevOtp(to: string, code: string, reason: string): SendOtpResult {
  console.log(`[OTP] ${to} → code: ${code}\n  (${reason})`);
  return { sent: true, devLogged: true };
}

async function sendWithNodemailer(payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const nm = loadNodemailer();
  if (!nm) throw new Error("nodemailer is not installed. Run: npm install nodemailer");
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const timeout = 25_000;
  const transporter = nm.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const from = process.env.SMTP_FROM?.trim() || `LMS <${process.env.SMTP_USER}>`;
  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

export type OtpEmailKind = "register" | "reset_password";

export async function sendOtpEmail(
  to: string,
  code: string,
  kind: OtpEmailKind = "register",
): Promise<SendOtpResult> {
  const isReset = kind === "reset_password";
  const subject = isReset ? "Your LMS password reset code" : "Your LMS verification code";
  const intro = isReset
    ? "Use this code to reset your password:"
    : "Use this code to complete registration:";
  const heading = isReset ? "Password reset" : "Email verification";
  const text = `Your ${isReset ? "password reset" : "verification"} code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`;
  const htmlBody = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#eb9422;margin:0 0 12px">${heading}</h2>
      <p style="color:#333">${intro}</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111">${code}</p>
      <p style="color:#666;font-size:14px">Expires in 10 minutes.</p>
    </div>
  `;

  if (!useRealSmtp()) {
    return logDevOtp(to, code, "OTP_USE_SMTP=false — code shown here / in terminal only");
  }

  const payload = { to, subject, text, html: htmlBody };

  if (loadNodemailer()) {
    await sendWithNodemailer(payload);
  } else {
    const { sendViaNativeSmtp } = await import("./smtp-native");
    await sendViaNativeSmtp(payload);
  }

  if (process.env.OTP_DEV_LOG === "true") {
    console.log(`[OTP] email sent to ${to}`);
  }

  return { sent: true, devLogged: false };
}
