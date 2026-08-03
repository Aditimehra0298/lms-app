import { redirect } from "next/navigation";

/** Short public alias → certificate verification portal. */
export default async function VerifyAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const key of ["q", "number", "delegate", "id", "email"] as const) {
    const value = params[key];
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw?.trim()) qs.set(key, raw.trim());
  }
  const suffix = qs.toString();
  redirect(suffix ? `/certificates/verify?${suffix}` : "/certificates/verify");
}
