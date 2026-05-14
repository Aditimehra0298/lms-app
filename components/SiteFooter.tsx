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
  MessageCircle,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import sfLightLogo from "@/Untitled design (4).png";

export default function SiteFooter() {
  const [isLightTheme, setIsLightTheme] = useState(false);
  const goldText = "text-[#fde68a]";
  const sectionShell = "mx-auto max-w-[1760px] px-4 md:px-6 xl:px-8";
  const footerShell = isLightTheme
    ? "border-t border-[#b4965a]/25 bg-[#f8f4ec]"
    : "border-t border-amber-500/20 bg-[#070707]";
  const cardShell = isLightTheme
    ? "bg-linear-to-b from-[#f8f4ec] via-[#f3ede3] to-[#efe7db]"
    : "bg-linear-to-b from-[#181107] via-[#100c08] to-[#090808]";
  const headingTone = isLightTheme ? "text-[#8a6412]" : "text-amber-300";
  const textTone = isLightTheme ? "text-slate-600" : "text-gray-300";
  const statTone = isLightTheme ? "text-slate-700" : "text-gray-200";
  const dividerTone = isLightTheme ? "border-[#b4965a]/25" : "border-amber-500/20";
  const copyrightTone = isLightTheme ? "text-slate-600" : "text-gray-400";

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
      <div className={`${sectionShell} ${isLightTheme ? "py-6" : "py-14"}`}>
        <div className={`${cardShell} p-1 md:p-2`}>
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="lg:w-[26%]">
              <div className={`flex items-center gap-3 text-lg font-bold ${isLightTheme ? "text-slate-800" : "text-white"}`}>
                <Image
                  src={isLightTheme ? sfLightLogo : sfWhiteLogo}
                  alt="Sustainable Futures Trainings"
                  className="h-11 w-auto object-contain"
                  priority
                />
                <span>
                  Sustainable Futures{" "}
                  <span className={isLightTheme ? "text-[#b8860b]" : goldText}>Trainings</span>
                </span>
              </div>
              <p className={`mt-4 text-sm leading-relaxed ${textTone}`}>
                Sustainable Futures Trainings is a team of QMS and professional learning experts delivering
                experiential online and offline training for individuals and organizations.
              </p>
              <div className={`mt-5 space-y-2 text-sm ${textTone}`}>
                <div className="flex items-center gap-2">
                  <Users size={15} className={headingTone} /> Expert Trainers
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={15} className={headingTone} /> Quality Content
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={15} className={headingTone} /> Flexible Learning
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className={headingTone} /> Certification
                </div>
              </div>
            </div>

            <div className="lg:w-[22%]">
              <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${headingTone}`}>Quick Links</h4>
              <ul className={`mt-4 space-y-2 text-sm ${textTone}`}>
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Our Courses", href: "/courses" },
                  { label: "Accreditations", href: "#" },
                  { label: "Candidate Register", href: "/account?mode=signup" },
                  { label: "Contact Us", href: "#" },
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms & Conditions", href: "#" },
                  { label: "Book a Call", href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className={`transition-colors ${isLightTheme ? "hover:text-[#8a6412]" : "hover:text-amber-200"}`}>
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
                  "Contact Us",
                  "Help Center",
                  "FAQs",
                  "Student Dashboard",
                  "Learning Guides",
                  "System Requirements",
                  "Feedback",
                ].map((l) => (
                  <li key={l}>
                    <a href="#" className={`transition-colors ${isLightTheme ? "hover:text-[#8a6412]" : "hover:text-amber-200"}`}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:w-[24%]">
              <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${headingTone}`}>Contact Us</h4>
              <div className={`mt-4 space-y-2 text-sm ${textTone}`}>
                <p className="flex items-center gap-2"><MapPin size={15} className={headingTone} /> UAE</p>
                <p className="flex items-center gap-2"><MapPin size={15} className={headingTone} /> Canada</p>
                <p className="flex items-center gap-2"><MapPin size={15} className={headingTone} /> India</p>
              </div>
              <div className={`mt-4 space-y-2 border-t ${dividerTone} pt-4 text-sm ${textTone}`}>
                <p className="flex items-center gap-2"><Mail size={15} className={headingTone} /> info@sftrainings.org</p>
                <p className="flex items-center gap-2"><Globe size={15} className={headingTone} /> www.sftrainings.org</p>
                <p className="flex items-center gap-2"><Phone size={15} className={headingTone} /> +91 90567 42783</p>
              </div>
              <div className="mt-5">
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${headingTone}`}>Stay Connected</p>
                <div className="mt-3 flex gap-3">
                  <a
                    href="#"
                    aria-label="LinkedIn"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-xs font-black text-white shadow-[0_0_14px_rgba(10,102,194,0.45)]"
                  >
                    in
                  </a>
                  <a
                    href="#"
                    aria-label="Facebook"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-sm font-black text-white shadow-[0_0_14px_rgba(24,119,242,0.45)]"
                  >
                    f
                  </a>
                  <a
                    href="#"
                    aria-label="Instagram"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-[10px] font-black uppercase text-white shadow-[0_0_14px_rgba(238,42,123,0.45)]"
                  >
                    ig
                  </a>
                  <a
                    href="#"
                    aria-label="YouTube"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF0000] text-[10px] font-black uppercase text-white shadow-[0_0_14px_rgba(255,0,0,0.45)]"
                  >
                    yt
                  </a>
                  <a
                    href="#"
                    aria-label="WhatsApp"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-[10px] font-black uppercase text-white shadow-[0_0_14px_rgba(37,211,102,0.45)]"
                  >
                    wa
                  </a>
                </div>
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
        © {new Date().getFullYear()} Sustainable Futures Trainings. All rights reserved.
      </div>
    </footer>
  );
}
