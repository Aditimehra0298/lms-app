/** Legal / public brand name — use in UI instead of SFT or Sustainable Futures Trainings. */
export const COMPANY_LEGAL_NAME = "Sustainable Futuristic Training LLP";
export const COMPANY_DISPLAY_NAME = "Sustainable Futuristic Trainings";

export const SFT_ABOUT_BLURB =
  "Sustainable Futuristic Training LLP is a team of 40 Quality Management Systems professionals. We have leveraged our QMS auditing experience and synergistic relationships with experts and platforms to deliver experiential QMS/ISO/IEC training online and offline.";

export const SFT_EMAILS = {
  info: "info@sftrainings.org",
  bdm: "bdm@sftrainings.org",
} as const;

export const SFT_SOCIAL = {
  instagram: "https://www.instagram.com/sftrainings",
  whatsapp: "https://wa.me/919056742783",
  linkedin: "https://www.linkedin.com/company/sftrainings",
} as const;

export const SFT_QUICK_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Our Courses", href: "/courses" },
  { label: "Verify Certificate", href: "/certificates/verify" },
  { label: "Accreditations", href: "/about" },
  { label: "Candidate Register", href: "/account?mode=signup" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Blogs", href: "/blogs" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Podcasts", href: "/podcasts" },
  { label: "Book a Call", href: "/book-a-call" },
] as const;

export type SftOffice = {
  title: string;
  country: string;
  /** ISO 3166-1 alpha-2 for real flag image (e.g. IN, CA, AE). */
  countryCode: string;
  address: string;
  phone: string;
  phoneHref: string;
  image: string;
  mapHref: string;
};

export const SFT_OFFICES: SftOffice[] = [
  {
    title: "Head Office — India",
    country: "India",
    countryCode: "IN",
    address: "146, Sector 82, Mohali, Punjab-160062",
    phone: "+91 9056742783",
    phoneHref: "tel:+919056742783",
    image: "/o1.png",
    mapHref: "https://maps.google.com/?q=146+Sector+82+Mohali+Punjab+160062",
  },
  {
    title: "Office — Canada",
    country: "Canada",
    countryCode: "CA",
    address: "8449, 116 A Street, Delta - V4C7N7, Greater Vancouver",
    phone: "+1 (778) 798-9624",
    phoneHref: "tel:+17787989624",
    image: "/o2.png",
    mapHref: "https://maps.google.com/?q=8449+116+A+Street+Delta+BC+V4C7N7",
  },
  {
    title: "Office — Dubai",
    country: "Dubai",
    countryCode: "AE",
    address: "Suite No 2902 and 2903, The Prism Tower, Business Bay, Dubai, UAE",
    phone: "+91 9056742783",
    phoneHref: "tel:+919056742783",
    image: "/o3.png",
    mapHref: "https://maps.google.com/?q=The+Prism+Tower+Business+Bay+Dubai",
  },
  {
    title: "Office — UK",
    country: "UK",
    countryCode: "GB",
    address: "20-22 Wenlock Road, Hoxton, London N1 7GU",
    phone: "+91 9056742783",
    phoneHref: "tel:+919056742783",
    image: "/o4.png",
    mapHref: "https://maps.google.com/?q=20-22+Wenlock+Road+London+N1+7GU",
  },
  {
    title: "Office — USA",
    country: "USA",
    countryCode: "US",
    address: "616 Corporate Way Suite 2, Valley Cottage, NY 10989",
    phone: "+91 9056742783",
    phoneHref: "tel:+919056742783",
    image: "/o5.png",
    mapHref: "https://maps.google.com/?q=616+Corporate+Way+Valley+Cottage+NY+10989",
  },
];
