import type { AdminContent, HomePageConfig } from "@/lib/content-schema";
import { defaultHomePageConfig } from "@/lib/content-schema";

export function mergeHomePageConfig(partial?: Partial<HomePageConfig>): HomePageConfig {
  const hp = partial ?? {};
  return {
    ...defaultHomePageConfig,
    ...hp,
    faqPage: { ...defaultHomePageConfig.faqPage, ...hp.faqPage },
    testimonialsPage: { ...defaultHomePageConfig.testimonialsPage, ...hp.testimonialsPage },
  };
}

export async function loadHomePageFromAdmin(): Promise<HomePageConfig> {
  try {
    const res = await fetch("/api/admin/content", { cache: "no-store" });
    if (!res.ok) return defaultHomePageConfig;
    const data = (await res.json()) as AdminContent;
    return mergeHomePageConfig(data.homePage);
  } catch {
    return defaultHomePageConfig;
  }
}

export async function saveHomePageToAdmin(config: HomePageConfig): Promise<boolean> {
  try {
    const put = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homePage: config }),
    });
    return put.ok;
  } catch {
    return false;
  }
}
