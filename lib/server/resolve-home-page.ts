import { readAdminContent } from "@/lib/server/content-store";
import { defaultHomePageConfig, type HomePageConfig } from "@/lib/content-schema";

export async function resolveHomePageConfig(): Promise<HomePageConfig> {
  const content = await readAdminContent();
  const hp: Partial<HomePageConfig> = content.homePage ?? {};
  return {
    ...defaultHomePageConfig,
    ...hp,
    faqPage: { ...defaultHomePageConfig.faqPage, ...hp.faqPage },
    testimonialsPage: { ...defaultHomePageConfig.testimonialsPage, ...hp.testimonialsPage },
  };
}
