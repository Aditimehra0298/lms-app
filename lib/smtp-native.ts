import { connect, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";

const TIMEOUT_MS = 25_000;

type SendOpts = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  envelopeFrom: string;
  fromHeader: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

function b64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

/** Extract bare email from `Name <a@b.com>` or `a@b.com`. */
function parseEnvelopeAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  if (m?.[1]) return m[1].trim();
  return from.trim();
}

function responseComplete(buf: string): boolean {
  const lines = buf.split(/\r\n/).filter((l) => l.length > 0);
  const last = lines[lines.length - 1];
  // Final SMTP line is "250 text" (space after code); continuation is "250-more"
  return Boolean(last && /^\d{3} /.test(last));
}

function readResponse(socket: Socket | TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SMTP read timeout")), TIMEOUT_MS);
    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      if (!responseComplete(buf)) return;
      clearTimeout(timer);
      socket.off("data", onData);
      const lines = buf.split(/\r\n/).filter((l) => l.length > 0);
      const last = lines[lines.length - 1] ?? "";
      const code = Number.parseInt(last.slice(0, 3), 10);
      if (Number.isNaN(code) || code >= 400) reject(new Error(last || buf));
      else resolve(buf);
    };
    socket.on("data", onData);
  });
}

async function writeLine(socket: Socket | TLSSocket, line: string): Promise<string> {
  socket.write(`${line}\r\n`);
  return readResponse(socket);
}

/** RFC 5321 dot-stuffing + CRLF line endings for DATA. */
function formatDataPayload(fromHeader: string, to: string, subject: string, text: string, html: string): string {
  const boundary = `----LmsOtp${Date.now()}`;
  const raw = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return raw
    .split(/\r\n|\n|\r/g)
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

async function sendStartTls(opts: SendOpts): Promise<void> {
  const socket = connect({ host: opts.host, port: opts.port });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("SMTP connect timeout")), TIMEOUT_MS);
    socket.once("connect", () => {
      clearTimeout(t);
      resolve();
    });
    socket.once("error", reject);
  });

  let tlsSocket: TLSSocket | null = null;
  try {
    await readResponse(socket);
    await writeLine(socket, "EHLO localhost");
    await writeLine(socket, "STARTTLS");
    tlsSocket = await new Promise<TLSSocket>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("STARTTLS timeout")), TIMEOUT_MS);
      const s = tlsConnect({ socket, servername: opts.host }, () => {
        clearTimeout(t);
        resolve(s);
      });
      s.once("error", reject);
    });

    await writeLine(tlsSocket, "EHLO localhost");
    await writeLine(tlsSocket, "AUTH LOGIN");
    await writeLine(tlsSocket, b64(opts.user));
    await writeLine(tlsSocket, b64(opts.pass));
    await writeLine(tlsSocket, `MAIL FROM:<${opts.envelopeFrom}>`);
    await writeLine(tlsSocket, `RCPT TO:<${opts.to}>`);
    await writeLine(tlsSocket, "DATA");
    const body = formatDataPayload(opts.fromHeader, opts.to, opts.subject, opts.text, opts.html);
    tlsSocket.write(`${body}\r\n.\r\n`);
    await readResponse(tlsSocket);
    await writeLine(tlsSocket, "QUIT");
  } finally {
    tlsSocket?.end();
    socket.destroy();
  }
}

async function sendSsl(opts: SendOpts): Promise<void> {
  const tlsSocket = tlsConnect({ host: opts.host, port: opts.port, servername: opts.host });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("SMTP SSL connect timeout")), TIMEOUT_MS);
    tlsSocket.once("secureConnect", () => {
      clearTimeout(t);
      resolve();
    });
    tlsSocket.once("error", reject);
  });

  try {
    await readResponse(tlsSocket);
    await writeLine(tlsSocket, "EHLO localhost");
    await writeLine(tlsSocket, "AUTH LOGIN");
    await writeLine(tlsSocket, b64(opts.user));
    await writeLine(tlsSocket, b64(opts.pass));
    await writeLine(tlsSocket, `MAIL FROM:<${opts.envelopeFrom}>`);
    await writeLine(tlsSocket, `RCPT TO:<${opts.to}>`);
    await writeLine(tlsSocket, "DATA");
    const body = formatDataPayload(opts.fromHeader, opts.to, opts.subject, opts.text, opts.html);
    tlsSocket.write(`${body}\r\n.\r\n`);
    await readResponse(tlsSocket);
    await writeLine(tlsSocket, "QUIT");
  } finally {
    tlsSocket.end();
  }
}

/** Gmail-compatible SMTP without nodemailer (STARTTLS on 587 or SSL on 465). */
export async function sendViaNativeSmtp(payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS are required");
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const fromHeader = process.env.SMTP_FROM?.trim() || `LMS <${user}>`;
  const envelopeFrom = parseEnvelopeAddress(fromHeader) || user;

  const opts: SendOpts = {
    host,
    port,
    secure,
    user,
    pass,
    envelopeFrom,
    fromHeader,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  };

  if (secure) await sendSsl(opts);
  else await sendStartTls(opts);
}
