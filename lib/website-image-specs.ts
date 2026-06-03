/** Image size guide for designers / admins uploading from computer. */
export type WebsiteImageSpec = {
  id: string;
  page: string;
  usage: string;
  filePath: string;
  widthPx: number;
  heightPx: number;
  aspectRatio: string;
  format: string;
  maxFileMb: number;
  notes: string;
};

export const WEBSITE_IMAGE_SPECS: WebsiteImageSpec[] = [
  {
    id: "contact-hero",
    page: "Contact Us",
    usage: "Hero illustration (right side)",
    filePath: "public/contact-us-1.png",
    widthPx: 1056,
    heightPx: 324,
    aspectRatio: "3.26:1 (wide banner)",
    format: "PNG with transparent or dark background",
    maxFileMb: 2,
    notes: "Display height ~340px on desktop. Use object-contain in hero.",
  },
  {
    id: "contact-cta",
    page: "Contact Us",
    usage: "Bottom CTA support character",
    filePath: "public/contact-us-2.png",
    widthPx: 440,
    heightPx: 340,
    aspectRatio: "~4:3",
    format: "PNG",
    maxFileMb: 1.5,
    notes: "Shown ~220px wide in CTA bar.",
  },
  {
    id: "office-grid",
    page: "Contact Us",
    usage: "Office location cards (5 images)",
    filePath: "public/o1.png … o5.png",
    widthPx: 1056,
    heightPx: 324,
    aspectRatio: "3.26:1 (wide banner)",
    format: "JPG or PNG",
    maxFileMb: 0.5,
    notes: "India=o1, Canada=o2, Dubai=o3, UK=o4, USA=o5. Cards use object-cover in 3:1 box.",
  },
  {
    id: "home-hero",
    page: "Home",
    usage: "Home hero / marketing banners",
    filePath: "public/h1.png, public/learnly-hero.mp4",
    widthPx: 1920,
    heightPx: 800,
    aspectRatio: "2.4:1",
    format: "PNG / MP4",
    maxFileMb: 5,
    notes: "Edit copy in Admin → Home Page. Video optional.",
  },
  {
    id: "course-card",
    page: "Courses catalog",
    usage: "Course card thumbnail",
    filePath: "public/p1.png (or per-course in admin)",
    widthPx: 640,
    heightPx: 360,
    aspectRatio: "16:9",
    format: "JPG or PNG",
    maxFileMb: 0.8,
    notes: "Upload per course in Admin → Self-paced courses → Content.",
  },
  {
    id: "category-hero",
    page: "Category pages",
    usage: "Category page hero",
    filePath: "public/food-safety-category-hero.png",
    widthPx: 1600,
    heightPx: 500,
    aspectRatio: "3.2:1",
    format: "JPG or PNG",
    maxFileMb: 1.2,
    notes: "Edit in Admin → Categories.",
  },
  {
    id: "about-hero",
    page: "About",
    usage: "About page hero image",
    filePath: "Set in Admin → About Page",
    widthPx: 1200,
    heightPx: 700,
    aspectRatio: "~16:9",
    format: "JPG or PNG",
    maxFileMb: 1.5,
    notes: "Configured in admin-content.json via About editor.",
  },
  {
    id: "admin-upload",
    page: "Admin uploads",
    usage: "Lesson video, PDF, images",
    filePath: "storage/private/admin or public/uploads/admin",
    widthPx: 0,
    heightPx: 0,
    aspectRatio: "N/A",
    format: "MP4, PDF, JPG, PNG per upload dialog",
    maxFileMb: 100,
    notes: "Use Admin → Self-paced courses → Content → Upload. Videos served via protected /api/media/serve.",
  },
];
