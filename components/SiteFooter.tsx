"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CircleCheck,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import sfLightLogo from "@/Untitled design (4).png";
import {
  COMPANY_DISPLAY_NAME,
  COMPANY_LEGAL_NAME,
  SFT_ABOUT_BLURB,
  SFT_EMAILS,
  SFT_OFFICES,
  SFT_QUICK_LINKS,
  SFT_SOCIAL,
} from "@/lib/contact-site-data";
import {
  SocialBrandIcon,
  SOCIAL_BRAND_BUTTON_CLASS,
  SOCIAL_BRAND_LABEL,
} from "@/components/SocialBrandIcon";
import { CountryFlagImg } from "@/components/CountryFlagImg";

export default function SiteFooter({ forceDarkChrome = false }: { forceDarkChrome?: boolean }) {
  const [isLightTheme, setIsLightTheme] = useState(false);
  const goldText = "text-[#fde68a]";
  const useLightTheme = isLightTheme && !forceDarkChrome;
  const sectionShell = "mx-auto max-w-[1760px] px-4 md:px-6 xl:px-8";
  const footerShell = useLightTheme
    ? "relative z-20 border-t border-[#b4965a]/25 bg-[#f8f4ec]"
    : "relative z-20 border-t border-amber-500/20 bg-[#070707]";
  const cardShell = useLightTheme
    ? "bg-linear-to-b from-[#f8f4ec] via-[#f3ede3] to-[#efe7db]"
    : "bg-linear-to-b from-[#181107] via-[#100c08] to-[#090808]";
  const headingTone = useLightTheme ? "text-[#8a6412]" : "text-amber-300";
  const textTone = useLightTheme ? "text-slate-600" : "text-gray-300";
  const statTone = useLightTheme ? "text-slate-700" : "text-gray-200";
  const dividerTone = useLightTheme ? "border-[#b4965a]/25" : "border-amber-500/20";
  const copyrightTone = useLightTheme ? "text-slate-600" : "text-gray-400";

  useEffect(() => {
    const syncTheme = () => {
      setIsLightTheme(document.documentElement.dataset.theme === "light");
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <footer className={footerShell}>
      <div className={`${sectionShell} ${useLightTheme ? "py-6" : "py-14"}`}>
        <div className={`${cardShell} p-1 md:p-2`}>
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="lg:w-[26%]">
              <div className={`flex items-center gap-3 text-lg font-bold ${useLightTheme ? "text-slate-800" : "text-white"}`}>
                <Image
                  src={useLightTheme ? sfLightLogo : sfWhiteLogo}
                  alt={COMPANY_DISPLAY_NAME}
                  className="h-11 w-auto object-contain"
                  priority
                />
                <span className={useLightTheme ? "text-slate-800" : "text-white"}>
                  {COMPANY_DISPLAY_NAME}
                </span>
              </div>
              <p className={`mt-4 text-sm leading-relaxed ${textTone}`}>{SFT_ABOUT_BLURB}</p>
              <div className={`mt-4 space-y-2 text-sm ${textTone}`}>
                <a href={`mailto:${SFT_EMAILS.info}`} className={`flex items-center gap-2 transition-colors ${useLightTheme ? "hover:text-[#8a6412]" : "hover:text-amber-200"}`}>
                  <Mail size={15} className={headingTone} /> {SFT_EMAILS.info}
                </a>
                <a href={`mailto:${SFT_EMAILS.bdm}`} className={`flex items-center gap-2 transition-colors ${useLightTheme ? "hover:text-[#8a6412]" : "hover:text-amber-200"}`}>
                  <Mail size={15} className={headingTone} /> {SFT_EMAILS.bdm}
                </a>
              </div>
              <div className="mt-5">
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${headingTone}`}>Stay Connected</p>
                <div className="mt-3 flex gap-3">
                  <a
                    href={SFT_SOCIAL.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_BRAND_LABEL.instagram}
                    title={SOCIAL_BRAND_LABEL.instagram}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_0_14px_rgba(238,42,123,0.45)] ${SOCIAL_BRAND_BUTTON_CLASS.instagram}`}
                  >
                    <SocialBrandIcon brand="instagram" size={18} />
                  </a>
                  <a
                    href={SFT_SOCIAL.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_BRAND_LABEL.whatsapp}
                    title={SOCIAL_BRAND_LABEL.whatsapp}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_0_14px_rgba(37,211,102,0.45)] ${SOCIAL_BRAND_BUTTON_CLASS.whatsapp}`}
                  >
                    <SocialBrandIcon brand="whatsapp" size={18} />
                  </a>
                  <a
                    href={SFT_SOCIAL.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_BRAND_LABEL.linkedin}
                    title={SOCIAL_BRAND_LABEL.linkedin}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_0_14px_rgba(10,102,194,0.45)] ${SOCIAL_BRAND_BUTTON_CLASS.linkedin}`}
                  >
                    <SocialBrandIcon brand="linkedin" size={18} />
                  </a>
                </div>
              </div>
            </div>

            <div className="lg:w-[22%]">
              <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${headingTone}`}>Quick Links</h4>
              <ul className={`mt-4 space-y-2 text-sm ${textTone}`}>
                {SFT_QUICK_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className={`transition-colors ${useLightTheme ? "hover:text-[#8a6412]" : "hover:text-amber-200"}`}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:w-[22%]">
              <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${headingTone}`}>Support</h4>
              <ul className={`mt-4 space-y-2 text-sm ${textTone}`}>
                {[
                  { label: "Contact Us", href: "/contact" },
                  { label: "Help Center", href: "/contact" },
                  { label: "FAQs", href: "/faq" },
                  { label: "Testimonials", href: "/testimonials" },
                  { label: "Student Dashboard", href: "/my-learning?tab=dashboard" },
                  { label: "Learning Guides", href: "/courses" },
                  { label: "System Requirements", href: "#" },
                  { label: "Feedback", href: "/contact" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className={`transition-colors ${useLightTheme ? "hover:text-[#8a6412]" : "hover:text-amber-200"}`}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:w-[24%]">
              <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${headingTone}`}>Contact Us</h4>
              <div className={`mt-4 space-y-4 text-sm ${textTone}`}>
                {SFT_OFFICES.map((office) => (
                  <div key={office.country} className={`border-b ${dividerTone} pb-3 last:border-b-0 last:pb-0`}>
                    <p className={`flex items-center gap-2.5 font-semibold ${useLightTheme ? "text-slate-800" : "text-white"}`}>
                      <CountryFlagImg
                        code={office.countryCode}
                        width={48}
                        className="h-5 w-7 rounded-sm border border-black/10 object-cover shadow-sm"
                      />
                      {office.country}
                    </p>
                    <p className="mt-1 flex items-start gap-2 text-xs leading-relaxed">
                      <MapPin size={14} className={`mt-0.5 shrink-0 ${headingTone}`} />
                      <span>{office.address}</span>
                    </p>
                    <a href={office.phoneHref} className={`mt-1.5 inline-flex items-center gap-2 text-xs transition-colors ${useLightTheme ? "hover:text-[#8a6412]" : "hover:text-amber-200"}`}>
                      <Phone size={14} className={headingTone} />
                      Call us {office.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`mt-8 flex flex-col gap-3 border-t ${dividerTone} pt-4 text-sm ${statTone} md:flex-row md:flex-wrap md:items-center md:justify-between`}>
            <div className="flex items-center gap-2"><Users size={16} className={headingTone} /> 50K+ Happy Learners</div>
            <div className="flex items-center gap-2"><BookOpen size={16} className={headingTone} /> 500+ Courses</div>
            <div className="flex items-center gap-2"><Globe size={16} className={headingTone} /> 30+ Countries</div>
            <div className="flex items-center gap-2"><CircleCheck size={16} className={headingTone} /> 100K+ Certificates</div>
            <div className="flex items-center gap-2"><ShieldCheck size={16} className={headingTone} /> 24/7 Learning Support</div>
          </div>
        </div>
      </div>
      <div className={`border-t ${dividerTone} py-5 text-center text-sm ${copyrightTone}`}>
        © {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
