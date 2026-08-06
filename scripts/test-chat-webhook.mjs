import { readFileSync } from "fs";

function loadEnv(path) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1].trim()] = v;
  }
}

loadEnv(".env.local");

const url = process.env.N8N_CHAT_WEBHOOK_URL;
const user = process.env.N8N_WEBHOOK_USER;
const password = process.env.N8N_WEBHOOK_PASSWORD;
const auth = Buffer.from(`${user}:${password}`, "utf8").toString("base64");

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${auth}`,
  },
  body: JSON.stringify({
    message: "Hello, what courses do you offer?",
    chatInput: "Hello, what courses do you offer?",
    sessionId: "test-script",
    source: "lms",
  }),
});

console.log("status", res.status);
console.log(await res.text());
