/** Normalize learner email for storage and lookups (fixes common typos like gmail,com). */
export function normalizeLearnerEmail(raw: string): string {
  let e = raw.trim().toLowerCase();
  if (!e) return e;
  // gmail,com → gmail.com and similar comma-before-TLD mistakes
  e = e.replace(/,com$/i, ".com");
  e = e.replace(/,co\.uk$/i, ".co.uk");
  e = e.replace(/,in$/i, ".in");
  e = e.replace(/,org$/i, ".org");
  e = e.replace(/,net$/i, ".net");
  return e;
}
