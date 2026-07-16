import type { ChatCourseDetail } from "@/lib/server/chat-course-catalog";
import type { LmsChatContext } from "@/lib/server/chat-lms-context";

export type ChatHistoryItem = { role: "user" | "assistant"; content: string };

const PAGES = {
  courses: "/courses",
  myLearning: "/my-learning",
  certificates: "/my-learning?tab=certificates",
  subscriptions: "/my-learning?tab=subscriptions",
  login: "/login",
  contact: "/contact",
} as const;

function firstName(ctx: LmsChatContext): string | null {
  const name = ctx.learner?.name?.trim();
  return name ? name.split(/\s+/)[0] : null;
}

function joinNatural(items: string[], max = 4): string {
  const slice = items.filter(Boolean).slice(0, max);
  if (!slice.length) return "";
  if (slice.length === 1) return slice[0];
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`;
  return `${slice.slice(0, -1).join(", ")}, and ${slice[slice.length - 1]}`;
}

function fmtCategory(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/-/g, " ");
}

function coursePath(slug: string): string {
  return `/my-learning/course/${slug}`;
}

function topCategories(ctx: LmsChatContext, max = 3): string {
  if (ctx.categories.length) {
    return joinNatural(ctx.categories.map((c) => c.label), max);
  }
  const cats = [...new Set(ctx.publishedCourses.map((c) => c.categoryLabel).filter(Boolean))];
  if (!cats.length) return "several professional topics";
  return joinNatural(cats, max);
}

function say(lead: string, body: string): string {
  const o = lead.trim();
  const b = body.trim();
  if (!o) return b;
  if (!b) return o;
  return `${o}\n\n${b}`;
}

function opener(
  ctx: LmsChatContext,
  kind: "warm" | "help" | "neutral" = "neutral",
  turn = 0,
): string {
  const name = firstName(ctx);
  const warm = name
    ? [`Hey ${name}!`, `Good to hear from you, ${name}.`, `Hi ${name} —`]
    : ["Hey!", "Hi there —", "Good to hear from you."];
  const help = name
    ? [`No problem, ${name}.`, `Happy to help, ${name}.`]
    : ["No problem.", "Happy to help."];
  const neutral = name
    ? [`Sure, ${name}.`, `Got it, ${name}.`, "Of course."]
    : ["Sure.", "Got it.", "Of course."];
  const pool = kind === "warm" ? warm : kind === "help" ? help : neutral;
  return pool[turn % pool.length];
}

function describeCoursesWithPrices(courses: ChatCourseDetail[], max = 4): string {
  if (!courses.length) {
    return "Our catalog is being updated right now — check back soon.";
  }

  const lines = courses.slice(0, max).map((c) => {
    const price = c.price ? ` — ${c.price}` : "";
    const duration = c.duration ? `, ${c.duration}` : "";
    const level = c.level ? `, ${c.level}` : "";
    return `• ${c.title}${price}${duration}${level}\n  ${c.coursePath}`;
  });

  let text = lines.join("\n");
  if (courses.length > max) {
    text += `\n\n…plus ${courses.length - max} more in this area.`;
  }
  return text;
}

function describeCourses(
  courses: ChatCourseDetail[],
  max = 3,
): string {
  if (!courses.length) {
    return "Our catalog is being updated right now — check back soon.";
  }

  const picked = courses.slice(0, max);
  const parts = picked.map((c) => {
    const price = c.price ? ` (${c.price})` : "";
    return `${c.title}${price}`;
  });

  let text = `I'd point you toward ${joinNatural(parts)}.`;
  if (courses.length > max) {
    text += ` There are ${courses.length - max} more on the catalog too.`;
  }
  return text;
}

function detectTopic(text: string): string | null {
  const q = text.toLowerCase();
  if (/certificate|certif|badge|credential/.test(q)) return "certificates";
  if (/enrol|enroll|my course|purchased|bought|what am i (taking|studying)/.test(q)) {
    return "enrollments";
  }
  if (/subscription|my plan/.test(q)) return "enrollments";
  if (/payment|paid|checkout|order|receipt|invoice|razorpay/.test(q)) return "payments";
  if (/progress|exam|quiz|mcq|assessment|lesson|unit|score|how far/.test(q)) return "progress";
  if (/video|buffer|stream|won't play|not playing|loading/.test(q)) return "video";
  if (/login|sign in|sign-in|password|can't access|google/.test(q)) return "login";
  if (/ticket|support|tech issue|bug|error|broken|not working/.test(q)) return "support";
  if (/categor|topics|areas|types of course|what do you offer/.test(q)) return "category";
  if (/about.*course|tell me about|what will i learn|what's in the/.test(q)) return "course-detail";
  if (/course|catalog|browse|recommend|training|learn|program/.test(q)) return "courses";
  return null;
}

function topicFromHistory(history: ChatHistoryItem[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const topic = detectTopic(history[i].content);
    if (topic) return topic;
  }
  return null;
}

function isGreeting(message: string): boolean {
  return /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup)\b/i.test(
    message.trim(),
  );
}

function isThanks(message: string): boolean {
  return /^(thanks|thank you|thx|ty|cheers|appreciate)/i.test(message.trim());
}

function isBye(message: string): boolean {
  return /^(bye|goodbye|see you|talk later|that's all|that is all)/i.test(message.trim());
}

function resolveTopic(message: string, history: ChatHistoryItem[], ctx: LmsChatContext): string {
  const q = message.toLowerCase();

  if (ctx.matchedCategory && ctx.categoryMatchedCourses.length) {
    const listingCategory = /courses?\b|show|list|browse|options|what do you have|with price|prices/.test(q);
    if (listingCategory && !/about the\b|tell me about\b|details on\b/.test(q)) {
      return "category";
    }
  }

  const direct = detectTopic(message);
  if (direct === "course-detail" && ctx.focusedCourse) return "course-detail";
  if (direct === "category") return "category";
  if (direct) return direct;

  if (ctx.focusedCourse && /about|price|cost|duration|learn|detail|how much/.test(q)) {
    return "course-detail";
  }
  if (ctx.matchedCategory && ctx.categoryMatchedCourses.length) return "category";

  if (/^(yes|yeah|yep|ok|okay|sure|tell me more|what else|go on|and\?|continue)/i.test(message.trim())) {
    return topicFromHistory(history) ?? "general";
  }
  return topicFromHistory(history) ?? "general";
}

function replyHello(ctx: LmsChatContext, turn: number): string {
  const name = firstName(ctx);
  const areas = topCategories(ctx);

  if (ctx.isLoggedIn) {
    if (ctx.enrollments.length) {
      const courses = joinNatural(ctx.enrollments.map((e) => e.title));
      return name
        ? `Hey ${name}! You're on ${courses} right now.\n\nWant to jump back in, check a certificate, or find something new?`
        : `Hey! You're on ${courses}.\n\nWant to continue learning, check certificates, or browse more courses?`;
    }
    return name
      ? `Hey ${name}! I can help with courses, certificates, payments — whatever you need on the platform.`
      : `Hey! Ask me about courses, your account, certificates, or how anything here works.`;
  }

  return name
    ? `Hey ${name}! We run ${ctx.publishedCourses.length} self-paced courses in ${areas}.\n\nPick a category below, or tell me what you're looking for — I can share prices, duration, and course details.`
    : `Hey! We have ${ctx.publishedCourses.length} self-paced courses in ${areas}.\n\nPick a category below, or tell me what you want to learn.`;
}

function replyThanks(ctx: LmsChatContext): string {
  const name = firstName(ctx);
  return name
    ? `Anytime, ${name}! Just message me if something else comes up.`
    : `Anytime! I'm here if you need anything else.`;
}

function replyBye(ctx: LmsChatContext): string {
  const name = firstName(ctx);
  return name
    ? `Take care, ${name}! Good luck with your learning.`
    : `Take care! Good luck with your learning.`;
}

function replyCertificates(ctx: LmsChatContext, turn: number): string {
  if (!ctx.isLoggedIn) {
    return say(
      opener(ctx, "help", turn),
      `Sign in first — then finished certificates appear under My Learning → Certificates.\n\nComplete a course, pass the exam, and yours will be ready to download.`,
    );
  }

  if (!ctx.certificates.length) {
    return say(
      opener(ctx, "neutral", turn),
      `Nothing issued yet on your account. Finish a course and pass the final exam, then check Certificates in My Learning.`,
    );
  }

  const ready = ctx.certificates.filter((c) => c.status === "ready" && c.visibleToLearner);
  const pending = ctx.certificates.filter((c) => c.status === "pending");

  if (ready.length === 1) {
    const c = ready[0];
    const score = c.scorePercent != null ? ` You scored ${c.scorePercent}%.` : "";
    return say(
      opener(ctx, "neutral", turn),
      `Your ${c.courseTitle} certificate is ready.${score}\n\nDownload it from My Learning → Certificates. Ref: ${c.certificateNumber}`,
    );
  }

  if (ready.length > 1) {
    return say(
      opener(ctx, "neutral", turn),
      `You've got certificates ready for ${joinNatural(ready.map((c) => c.courseTitle))}.\n\nGrab them from My Learning → Certificates whenever you like.`,
    );
  }

  if (pending.length) {
    return say(
      opener(ctx, "neutral", turn),
      `Your ${pending[0].courseTitle} certificate is still being generated — shouldn't take long. Check Certificates in My Learning for updates.`,
    );
  }

  return say(
    opener(ctx, "neutral", turn),
    `You have certificate records on file. Open My Learning → Certificates to view them.`,
  );
}

function replyEnrollments(ctx: LmsChatContext, turn: number): string {
  if (!ctx.isLoggedIn) {
    return say(
      opener(ctx, "help", turn),
      `Sign in and I'll show what's on your account — or browse the catalog in the meantime.`,
    );
  }

  if (!ctx.enrollments.length) {
    return say(
      opener(ctx, "neutral", turn),
      `You're not enrolled in anything yet — great place to start fresh.\n\nBrowse the catalog and pick what fits your goals.`,
    );
  }

  if (ctx.enrollments.length === 1) {
    const e = ctx.enrollments[0];
    return say(
      opener(ctx, "neutral", turn),
      `You're on ${e.title}.\n\nPick up where you left off: ${coursePath(e.slug)}`,
    );
  }

  const latest = ctx.enrollments[0];
  return say(
    opener(ctx, "neutral", turn),
    `You're enrolled in ${joinNatural(ctx.enrollments.map((e) => e.title))}.\n\n${latest.title} is probably the easiest place to jump back in: ${coursePath(latest.slug)}`,
  );
}

function replyPayments(ctx: LmsChatContext, turn: number): string {
  if (!ctx.isLoggedIn) {
    return say(opener(ctx, "help", turn), `Sign in and I can look up your payment history for you.`);
  }

  if (!ctx.payments.length) {
    return say(
      opener(ctx, "neutral", turn),
      `I don't see payments linked to your email yet. If you just paid, give it a minute — otherwise our team can help on the contact page.`,
    );
  }

  const latest = ctx.payments[0];
  const amount =
    latest.currency.toUpperCase() === "INR"
      ? `₹${(latest.amount / 100).toFixed(0)}`
      : `${latest.currency} ${latest.amount}`;
  const courses = latest.courseTitles.length ? joinNatural(latest.courseTitles) : "a course";
  const when = latest.paidAt ? `, paid ${latest.paidAt.slice(0, 10)}` : "";

  const detail =
    ctx.payments.length === 1
      ? `Your latest payment is ${latest.status} — ${amount} for ${courses}${when}.`
      : `I see ${ctx.payments.length} payments. The latest is ${latest.status} (${amount} for ${courses}${when}).`;

  return say(opener(ctx, "neutral", turn), `${detail}\n\nFull history is under Subscriptions in My Learning.`);
}

function replyCourses(ctx: LmsChatContext, message: string, turn: number): string {
  const matched = ctx.messageMatchedCourses.length
    ? ctx.messageMatchedCourses
    : ctx.publishedCourses;

  if (ctx.isLoggedIn && /recommend|for me|suggest|should i|what.*take|looking for/i.test(message)) {
    const enrolledSlugs = new Set(ctx.enrollments.map((e) => e.slug));
    const suggestions = ctx.publishedCourses.filter((c) => !enrolledSlugs.has(c.slug));
    if (suggestions.length) {
      return say(
        opener(ctx, "neutral", turn),
        `Since you haven't taken these yet, ${describeCourses(suggestions, 3)}\n\nWant details on any of them?`,
      );
    }
    return say(
      opener(ctx, "neutral", turn),
      `You've covered a good chunk of our catalog already! Revisit anything from My Learning whenever you like.`,
    );
  }

  if (ctx.messageMatchedCourses.length) {
    return say(
      opener(ctx, "neutral", turn),
      `That matches a few of ours. ${describeCourses(matched, 4)}\n\nBrowse all courses: ${PAGES.courses}`,
    );
  }

  return say(
    opener(ctx, "neutral", turn),
    `We have ${ctx.publishedCourses.length} courses live right now. ${describeCourses(matched, 3)}\n\nSee everything: ${PAGES.courses}`,
  );
}

function replyProgress(ctx: LmsChatContext, turn: number): string {
  if (!ctx.isLoggedIn) {
    return say(
      opener(ctx, "help", turn),
      `Sign in, then open My Learning — progress saves automatically as you finish lessons and exams.`,
    );
  }

  if (ctx.enrollments.length) {
    const e = ctx.enrollments[0];
    return say(
      opener(ctx, "neutral", turn),
      `Progress lives inside each course. Open ${e.title}, work through the lessons, then take the MCQ exam when you're ready.\n\nContinue here: ${coursePath(e.slug)}`,
    );
  }

  return say(
    opener(ctx, "neutral", turn),
    `Enroll in a course first — after that, every lesson and exam you complete is tracked automatically.`,
  );
}

function replyLogin(ctx: LmsChatContext, turn: number): string {
  return say(
    opener(ctx, "help", turn),
    `Go to the login page and use the email you registered with. Signed up with Google? Use Continue with Google each time.\n\nStill stuck? Reach our team on the contact page.`,
  );
}

function replyVideoIssue(ctx: LmsChatContext, turn: number): string {
  return say(
    opener(ctx, "help", turn),
    `Try a quick refresh first, then Chrome or Edge with ad-blockers off. If only one lesson fails, tell me which course — if it's everything, our support team can help on the contact page.`,
  );
}

function replySupportIssues(ctx: LmsChatContext, turn: number): string {
  if (!ctx.supportIssues.length) {
    return say(
      opener(ctx, "neutral", turn),
      `No open tickets on your account. Tell me what's going wrong and I'll do my best — or message us on the contact page.`,
    );
  }

  const ticket = ctx.supportIssues[0];
  const status = ticket.status.replace(/_/g, " ");

  if (ctx.supportIssues.length === 1) {
    return say(
      opener(ctx, "neutral", turn),
      `You've got ticket ${ticket.issueToken} open (${status}). We'll follow up by email — contact us directly if it's urgent.`,
    );
  }

  return say(
    opener(ctx, "neutral", turn),
    `You have ${ctx.supportIssues.length} open tickets, including ${ticket.issueToken}. We're on it.`,
  );
}

function replyCategory(ctx: LmsChatContext, turn: number): string {
  if (!ctx.categories.length) {
    return say(opener(ctx, "neutral", turn), `Browse our catalog at ${PAGES.courses}`);
  }

  if (ctx.matchedCategory && ctx.categoryMatchedCourses.length) {
    const cat = ctx.categories.find((c) => c.slug === ctx.matchedCategory);
    const label = cat?.label ?? fmtCategory(ctx.matchedCategory);
    return say(
      opener(ctx, "neutral", turn),
      `Here are our ${label} courses:\n\n${describeCoursesWithPrices(ctx.categoryMatchedCourses, 6)}\n\nSee the full ${label} category: ${cat?.categoryPath ?? `/courses/category/${ctx.matchedCategory}`}`,
    );
  }

  const catList = ctx.categories
    .map((c) => `• ${c.label} (${c.count} courses) — ${c.categoryPath}`)
    .join("\n");

  return say(
    opener(ctx, "neutral", turn),
    `We organise training into these areas:\n\n${catList}\n\nTell me a category — e.g. "show me ESG courses" — and I'll list options with prices.`,
  );
}

function replyCourseDetail(ctx: LmsChatContext, turn: number): string {
  const course = ctx.focusedCourse ?? ctx.messageMatchedCourses[0];
  if (!course) {
    return replyCourses(ctx, "courses", turn);
  }

  const priceLine = course.oldPrice
    ? `Price: ${course.price} (was ${course.oldPrice})`
    : course.price
      ? `Price: ${course.price}`
      : "";

  const meta = [priceLine, course.duration && `Duration: ${course.duration}`, course.level && `Level: ${course.level}`, course.rating && `Rating: ${course.rating}`]
    .filter(Boolean)
    .join(" · ");

  let body = `${course.title}\n${course.subtitle || ""}\n\n${meta}`;

  if (course.moduleCount) {
    body += `\n\n${course.moduleCount} modules, ${course.lessonCount} lessons · ${course.learningFormat}`;
  }

  if (course.learnOutcomes.length) {
    body += `\n\nYou'll learn: ${joinNatural(course.learnOutcomes, 4)}.`;
  }

  if (course.highlights.length) {
    body += `\n\n${course.highlights[0]}`;
  }

  body += `\n\nView full details: ${course.coursePath}`;

  return say(opener(ctx, "neutral", turn), body);
}

function replyGeneral(ctx: LmsChatContext, turn: number): string {
  const name = firstName(ctx);

  if (ctx.isLoggedIn && ctx.enrollments.length) {
    return name
      ? `${name}, I can check your courses, certificates, or payments — or help you find something new. What do you need?`
      : `I can check your courses, certificates, or payments — or help you find something new. What do you need?`;
  }

  return say(
    opener(ctx, "neutral", turn),
    `I help with courses, enrollments, certificates, and getting around the platform. ${describeCourses(ctx.publishedCourses.slice(0, 3), 3)}`,
  );
}

function buildReply(
  topic: string,
  ctx: LmsChatContext,
  message: string,
  turn: number,
): string {
  switch (topic) {
    case "certificates":
      return replyCertificates(ctx, turn);
    case "enrollments":
      return replyEnrollments(ctx, turn);
    case "payments":
      return replyPayments(ctx, turn);
    case "progress":
      return replyProgress(ctx, turn);
    case "video":
      return replyVideoIssue(ctx, turn);
    case "login":
      return replyLogin(ctx, turn);
    case "support":
      return replySupportIssues(ctx, turn);
    case "courses":
      return replyCourses(ctx, message, turn);
    case "category":
      return replyCategory(ctx, turn);
    case "course-detail":
      return replyCourseDetail(ctx, turn);
    default:
      return replyGeneral(ctx, turn);
  }
}

/** Conversational reply from live MySQL context when external AI is unavailable. */
export function buildLocalChatReply(
  message: string,
  ctx: LmsChatContext,
  history: ChatHistoryItem[] = [],
): string {
  const trimmed = message.trim();
  if (!trimmed) return "Whenever you're ready — just type your question.";

  const turn = history.length;

  if (isGreeting(trimmed)) return replyHello(ctx, turn);
  if (isThanks(trimmed)) return replyThanks(ctx);
  if (isBye(trimmed)) return replyBye(ctx);

  const topic = resolveTopic(trimmed, history, ctx);
  return buildReply(topic, ctx, trimmed, turn);
}

/** Relative paths the chat UI can render as clickable links. */
export { PAGES as CHAT_PAGE_PATHS };
