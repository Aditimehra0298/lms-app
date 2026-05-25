/**
 * Converts data/admin-content.json into a readable markdown knowledge base
 * for the OpenAI Assistant.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "..");

const raw = readFileSync(join(root, "data", "admin-content.json"), "utf-8");
const data = JSON.parse(raw);

const lines = [];

function h1(text) { lines.push("", `# ${text}`, ""); }
function h2(text) { lines.push("", `## ${text}`, ""); }
function h3(text) { lines.push("", `### ${text}`, ""); }
function h4(text) { lines.push("", `#### ${text}`, ""); }
function p(text) { if (text) lines.push("", text, ""); }
function ul(items) { for (const i of items) if (i) lines.push(`- ${i}`); }
function sep() { lines.push("", "---", ""); }
function bold(text) { return `**${text}**`; }

// ── 1. Platform Overview ──────────────────────────────────
h1("Sustainable Futures Training — Knowledge Base");

const hp = data.homePage || {};
const cp = data.coursesPage || {};

h2("Platform Overview");

if (hp.hero) {
  p(`${hp.hero.heading || ""} ${hp.hero.headingHighlight || ""}`.trim());
  p(hp.hero.subtitle);
}

if (hp.stats?.length) {
  h3("Key Stats");
  ul(hp.stats.map((s) => `${s.value} — ${s.label}`));
}

// ── 2. Learning Paths ─────────────────────────────────────
if (hp.learningPaths?.length) {
  h2("Learning Paths / Formats");
  for (const lp of hp.learningPaths) {
    h3(lp.title);
    p(lp.desc);
    if (lp.keyPoints?.length) ul(lp.keyPoints);
  }
}

// ── 3. Categories ─────────────────────────────────────────
if (data.categories?.length) {
  h2("Course Categories");
  for (const cat of data.categories.filter((c) => c.isActive)) {
    lines.push(`- **${cat.title}**${cat.subtitle ? ` — ${cat.subtitle}` : ""}`);
    if (cat.description) p(`  ${cat.description}`);
  }
}

// ── 4. Self-Paced Courses ─────────────────────────────────
if (data.managedCourses?.length) {
  h2("Self-Paced Courses (Catalog)");
  for (const course of data.managedCourses.filter((c) => c.published)) {
    h3(course.title);
    if (course.subtitle) p(course.subtitle);
    ul([
      course.category ? `Category: ${course.category}` : null,
      course.level ? `Level: ${course.level}` : null,
      course.duration ? `Duration: ${course.duration}` : null,
      course.price ? `Price: ${course.price}` : null,
      course.oldPrice ? `Original Price: ${course.oldPrice}` : null,
      course.rating ? `Rating: ${course.rating}` : null,
      course.learners ? `Learners: ${course.learners}` : null,
      course.learningFormat ? `Format: ${course.learningFormat}` : null,
      course.instructorName ? `Instructor: ${course.instructorName}` : null,
    ].filter(Boolean));

    if (course.curriculum?.length) {
      h4("Curriculum");
      for (const mod of course.curriculum) {
        lines.push(`- **${mod.title}**`);
        if (mod.items?.length) {
          for (const item of mod.items) {
            const tag = item.kind === "video" ? "🎬" : item.kind === "exam" ? "📝" : "📖";
            lines.push(`  - ${tag} ${item.label}`);
            if (item.about) p(`    > ${item.about.substring(0, 300)}...`);
            if (item.learningOutcomes?.length) {
              for (const lo of item.learningOutcomes) lines.push(`    - Outcome: ${lo}`);
            }
          }
        }
      }
    }
    sep();
  }
}

// ── 5. Tutor-Led Programs ────────────────────────────────
if (data.tutorLedPrograms?.length) {
  h2("Tutor-Led (Live) Programs");
  for (const prog of data.tutorLedPrograms.filter((p) => p.published)) {
    h3(prog.title);
    if (prog.subtitle) p(prog.subtitle);

    const d = prog.batchDetails || [];
    ul([
      prog.trainer?.name ? `Trainer: ${prog.trainer.name} (${prog.trainer.role})` : null,
      prog.trainer?.experience ? `Experience: ${prog.trainer.experience}` : null,
      prog.nextBatchDate ? `Next Batch: ${prog.nextBatchDate}` : null,
      prog.schedule ? `Schedule: ${prog.schedule}` : null,
      prog.language ? `Language: ${prog.language}` : null,
      prog.price ? `Price: ₹${prog.price}` : null,
      prog.originalPrice ? `Original Price: ₹${prog.originalPrice}` : null,
      prog.discount ? `Discount: ${prog.discount}` : null,
      prog.seatsLeft ? `Seats Left: ${prog.seatsLeft}` : null,
      ...d.map((bd) => `${bd.label}: ${bd.value}`),
    ].filter(Boolean));

    if (prog.highlights?.length) {
      h4("Highlights");
      ul(prog.highlights);
    }

    if (prog.curriculum?.length) {
      h4("Curriculum");
      for (const mod of prog.curriculum) {
        lines.push(`- **Week ${mod.week} — ${mod.topic}** (${mod.sessionType})`);
        if (mod.keyLearning) lines.push(`  - ${mod.keyLearning}`);
      }
    }

    if (prog.whyChoose?.length) {
      h4("Why Choose This Program");
      for (const wc of prog.whyChoose) {
        lines.push(`- **${wc.title}**: ${wc.desc}`);
      }
    }

    if (prog.faqs?.length) {
      h4("Program FAQs");
      for (const faq of prog.faqs) {
        lines.push(`- **Q:** ${faq.q}`);
        lines.push(`  **A:** ${faq.a}`);
      }
    }

    if (prog.trainer?.bio && prog.trainer.bio !== prog.subtitle) {
      h4("About the Trainer");
      p(prog.trainer.bio);
      if (prog.trainer.certifications?.length) {
        p("Certifications:");
        ul(prog.trainer.certifications);
      }
      if (prog.trainer.workedWith?.length) {
        p("Industry Experience:");
        ul(prog.trainer.workedWith);
      }
    }
    sep();
  }
}

// ── 6. Homepage FAQs ─────────────────────────────────────
if (hp.faqs?.length) {
  h2("Frequently Asked Questions (General)");
  for (const faq of hp.faqs) {
    if (faq.q && faq.a) {
      lines.push(`- **Q:** ${faq.q}`);
      lines.push(`  **A:** ${faq.a}`);
    } else if (faq.question) {
      lines.push(`- **Q:** ${faq.question}`);
    }
  }
}

// ── 7. Pricing Plans ─────────────────────────────────────
h2("Pricing & Plans");

if (hp.individualPlans?.length) {
  h3("Individual Plans");
  for (const plan of hp.individualPlans) {
    h4(plan.badge || "Plan");
    if (plan.tagline) p(plan.tagline);
    if (plan.desc) p(plan.desc);
    p(bold(plan.price));
    if (plan.note) p(`*${plan.note}*`);
    if (plan.features?.length) ul(plan.features);
  }
}

if (hp.orgPlan) {
  h3("Organization Plan");
  const org = hp.orgPlan;
  if (org.tagline) p(org.tagline);
  if (org.desc) p(org.desc);
  p(bold(org.price));
  if (org.note) p(`*${org.note}*`);
  if (org.features?.length) ul(org.features);
}

// ── 8. About Page ────────────────────────────────────────
const ap = data.aboutPage || {};
if (ap.hero) {
  h2("About Sustainable Futures Trainings");
  p(ap.hero.subtitle);
}

if (ap.whoWeAre) {
  h3("Who We Are");
  p(ap.whoWeAre.subtitle);
  if (ap.whoWeAre.bulletPoints?.length) ul(ap.whoWeAre.bulletPoints);
}

if (ap.pillars?.length) {
  for (const pillar of ap.pillars) {
    h3(pillar.title);
    p(pillar.desc);
  }
}

if (ap.features?.length) {
  h3("Key Features");
  for (const f of ap.features) {
    lines.push(`- **${f.title}**: ${f.desc}`);
  }
}

if (ap.accreditations?.length) {
  h3("Accreditations & Affiliations");
  for (const acc of ap.accreditations) {
    lines.push(`- **${acc.title}** — ${acc.subtitle}: ${acc.desc}`);
  }
}

if (ap.impactStats?.length) {
  h3("Impact");
  ul(ap.impactStats.map((s) => `${s.value} — ${s.label}`));
}

// ── 9. Why Choose Us / Features ──────────────────────────
if (hp.whyFeatures?.length) {
  h2("Why Choose Sustainable Futures Trainings");
  for (const f of hp.whyFeatures) {
    lines.push(`- **${f.title}**: ${f.desc}`);
  }
}

// ── 10. Testimonials ─────────────────────────────────────
if (hp.testimonials?.length) {
  h2("What Learners Say");
  for (const t of hp.testimonials) {
    lines.push(`> "${t.quote}"`);
    lines.push(`> — ${t.name}${t.role ? `, ${t.role}` : ""}`);
    lines.push("");
  }
}

// ── Write out ────────────────────────────────────────────
const output = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
const outPath = join(root, "data", "knowledge-base.md");
writeFileSync(outPath, output, "utf-8");
console.log(`✅ Wrote ${outPath} (${(output.length / 1024).toFixed(1)} KB)`);
