/**
 * Recover pending/failed certificates using LMS local PDF fallback.
 * Usage: node --env-file=.env.local scripts/recover-pending-certificates.mjs [email]
 */
const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const email = (process.argv[2] || "aditimehra0298@gmail.com").trim().toLowerCase();

async function main() {
  const res = await fetch(`${baseUrl}/api/certificates/recover-pending`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  console.log(res.status, JSON.stringify(data, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
