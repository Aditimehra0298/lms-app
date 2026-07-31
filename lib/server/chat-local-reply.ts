import type { ChatCourseDetail } from "@/lib/server/chat-course-catalog";
import { isGeneralCatalogQuestion, normalizeChatQuery } from "@/lib/server/chat-course-catalog";
import type { LmsChatContext } from "@/lib/server/chat-lms-context";

export type ChatHistoryItem = { role: "user" | "assistant"; content: string };

const PAGES = {
  courses: "/courses",
  myLearning: "/my-learning",
  certificates: "/my-learning?tab=certificates",
  subscriptions: "/my-learning?tab=subscriptions",
  assignments: "/my-learning?tab=assignments",
  login: "/account?mode=login",
  contact: "/contact",
} as const;

/** Topics that need a signed-in learner so we can return real MySQL account data. */
const ACCOUNT_TOPICS = new Set([
  "certificates",
  "enrollments",
  "payments",
  "progress",
  "assignments",
  "support",
]);

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function replyNeedLogin(ctx: LmsChatContext, topic: string, turn: number): string {
  const what: Record<string, string> = {
    certificates: "your certificates",
    enrollments: "your enrolled courses",
    payments: "your payment history",
    progress: "your course progress",
    assignments: "your assignments",
    support: "your support tickets",
  };
  const label = what[topic] ?? "your account details";
  return say(
    opener(ctx, "help", turn),
    `To show ${label} from your account, please sign in first.\n\nSign in here: ${PAGES.login}\n\nAfter you log in, ask me again — I'll pull the real information from your LMS profile (courses, payments, certificates, and more).`,
  );
}

function learnerName(ctx: LmsChatContext): string | null {
  const name = ctx.learner?.name?.trim();
  return name ? name.replace(/\s+/g, " ") : null;
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
  const name = learnerName(ctx);
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
  if (/assignment|homework|submit work|due date/.test(q)) return "assignments";
  if (/\bfaq\b|frequently asked|how does (this|the) (site|platform)|general question/.test(q)) {
    return "faq";
  }
  if (/enrol|enroll|my course|purchased|bought|what am i (taking|studying)/.test(q)) {
    return "enrollments";
  }
  if (/subscription|my plan/.test(q)) return "enrollments";
  if (/payment|paid|checkout|order|receipt|invoice|razorpay|refund|charged/.test(q)) {
    return "payments";
  }
  if (/progress|exam|quiz|mcq|assessment|lesson|unit|score|how far/.test(q)) return "progress";
  if (/video|buffer|stream|won't play|not playing|loading/.test(q)) return "video";
  if (/login|sign in|sign-in|password|can't access|google/.test(q)) return "login";
  if (/ticket|support|tech issue|bug|error|broken|not working/.test(q)) return "support";
  if (/categor|topics|areas|types of course|what do you offer|courses (in|on|for)|show me .* courses/.test(q)) {
    return "category";
  }
  if (
    /about.*course|tell me about|what will i learn|what's in the|information|info|details|want (to )?(know|learn)|i want .* (course|cyber|esg|training)/.test(
      q,
    )
  ) {
    return "course-detail";
  }
  if (/course|catalog|browse|recommend|training|learn|program|cyber|esg|phishing|hvac/.test(q)) {
    return "courses";
  }
  return null;
}

/** Public intent label for chat history / analytics. */
export function detectChatIntent(text: string): string {
  return detectTopic(text) ?? "general";
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
  const q = normalizeChatQuery(message);

  // "your course information" → LMS categories overview, never one random course
  if (isGeneralCatalogQuestion(message)) return "category";

  // Prefer real catalog matches from /api/courses data.
  if (ctx.matchedCategory && ctx.categoryMatchedCourses.length) {
    const wantOneCourse = /about this|tell me about|details on|how much is|price of/.test(q);
    const listingCategory = /courses?\b|show|list|browse|options|what do you have|with price|prices|in cyber|cyber security/.test(q);
    if (listingCategory || ctx.categoryMatchedCourses.length > 1) return "category";
    if (wantOneCourse && ctx.focusedCourse) return "course-detail";
    if (ctx.focusedCourse && ctx.categoryMatchedCourses.length === 1) return "course-detail";
    return "category";
  }

  if (ctx.messageMatchedCourses.length === 1 && ctx.focusedCourse) {
    return "course-detail";
  }
  if (ctx.messageMatchedCourses.length > 1) {
    return "courses";
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
  const name = learnerName(ctx);
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
  const name = learnerName(ctx);
  return name
    ? `Anytime, ${name}! Just message me if something else comes up.`
    : `Anytime! I'm here if you need anything else.`;
}

function replyBye(ctx: LmsChatContext): string {
  const name = learnerName(ctx);
  return name
    ? `Take care, ${name}! Good luck with your learning.`
    : `Take care! Good luck with your learning.`;
}

function replyCertificates(ctx: LmsChatContext, turn: number): string {
  if (!ctx.isLoggedIn) return replyNeedLogin(ctx, "certificates", turn);

  const email = ctx.learner?.email ? ` (${ctx.learner.email})` : "";
  if (!ctx.certificates.length) {
    return say(
      opener(ctx, "neutral", turn),
      `I checked your account${email} — no certificates have been issued yet.\n\nFinish the course modules and pass the final exam, then they'll show under My Learning → Certificates.\n\n${PAGES.certificates}`,
    );
  }

  const ready = ctx.certificates.filter((c) => c.status === "ready" && c.visibleToLearner);
  const pending = ctx.certificates.filter((c) => c.status === "pending");

  if (ready.length === 1) {
    const c = ready[0];
    const score = c.scorePercent != null ? `\n• Score: ${c.scorePercent}%` : "";
    const issued = c.issuedAt ? `\n• Issued: ${formatShortDate(c.issuedAt)}` : "";
    return say(
      opener(ctx, "neutral", turn),
      `Here's what I found on your account${email}:\n\n• ${c.courseTitle} — ready to download${score}${issued}\n• Certificate no: ${c.certificateNumber}\n\nOpen it here: ${PAGES.certificates}`,
    );
  }

  if (ready.length > 1) {
    const lines = ready
      .slice(0, 5)
      .map((c) => {
        const score = c.scorePercent != null ? ` (${c.scorePercent}%)` : "";
        return `• ${c.courseTitle}${score} — ${c.certificateNumber}`;
      })
      .join("\n");
    return say(
      opener(ctx, "neutral", turn),
      `You have ${ready.length} certificates ready on your account${email}:\n\n${lines}\n\nDownload them: ${PAGES.certificates}`,
    );
  }

  if (pending.length) {
    return say(
      opener(ctx, "neutral", turn),
      `Your ${pending[0].courseTitle} certificate is still being prepared — status: pending.\n\nCheck back under Certificates shortly: ${PAGES.certificates}`,
    );
  }

  return say(
    opener(ctx, "neutral", turn),
    `I found certificate records on your account. Open My Learning → Certificates to view them:\n${PAGES.certificates}`,
  );
}

function replyEnrollments(ctx: LmsChatContext, turn: number): string {
  if (!ctx.isLoggedIn) return replyNeedLogin(ctx, "enrollments", turn);

  const email = ctx.learner?.email ? ` for ${ctx.learner.email}` : "";
  if (!ctx.enrollments.length) {
    return say(
      opener(ctx, "neutral", turn),
      `I looked up your account${email} — you're not enrolled in any courses yet.\n\nBrowse the catalog and enroll when you're ready: ${PAGES.courses}`,
    );
  }

  if (ctx.enrollments.length === 1) {
    const e = ctx.enrollments[0];
    const when = e.enrolledAt ? ` (enrolled ${formatShortDate(e.enrolledAt)})` : "";
    return say(
      opener(ctx, "neutral", turn),
      `From your account${email}, you're enrolled in:\n\n• ${e.title}${when}\n\nContinue learning: ${coursePath(e.slug)}`,
    );
  }

  const lines = ctx.enrollments
    .slice(0, 6)
    .map((e) => {
      const when = e.enrolledAt ? ` — enrolled ${formatShortDate(e.enrolledAt)}` : "";
      return `• ${e.title}${when}\n  ${coursePath(e.slug)}`;
    })
    .join("\n");
  return say(
    opener(ctx, "neutral", turn),
    `You're enrolled in ${ctx.enrollments.length} courses${email}:\n\n${lines}\n\nDashboard: ${PAGES.myLearning}`,
  );
}

function looksLikePaymentProblem(message: string): boolean {
  return (
    /\b(payment|paid|razorpay|refund|charged|transaction|invoice|checkout)\b/i.test(message) &&
    /\b(fail|failed|problem|issue|error|not|didn'?t|pending|stuck|help|wrong|missing)\b/i.test(
      message,
    )
  );
}

function replyPaymentProblem(ctx: LmsChatContext, turn: number): string {
  const name = learnerName(ctx);
  const lead = name ? `Sorry about the payment trouble, ${name}.` : "Sorry about the payment trouble.";
  return say(
    opener(ctx, "help", turn),
    `${lead}\n\nWhat's your Student ID?`,
  );
}

function paymentFollowUpFromHistory(message: string, history: ChatHistoryItem[]): string | null {
  const blob = [...history.map((h) => h.content), message].join("\n");
  const askedStudent = /student id/i.test(blob);
  const askedTxn = /transaction id/i.test(blob);
  const askedDate = /payment date/i.test(blob);

  const hasStudent =
    /\b(?:student\s*(?:id|number)|learner\s*id)\s*[:=#]?\s*[A-Za-z0-9_-]{3,}/i.test(message) ||
    (askedStudent && /^[A-Za-z0-9_-]{3,64}$/.test(message.trim()));
  const hasTxn =
    /\b(?:txn|transaction|payment|razorpay|order)\s*(?:id|ref)?\s*[:=#]?\s*[A-Za-z0-9_-]{6,}/i.test(
      message,
    ) || (askedTxn && !askedDate && /^[A-Za-z0-9_-]{6,128}$/.test(message.trim()));
  const hasDate =
    /\b(?:paid\s*on|payment\s*date|date)\s*[:=]?\s*/i.test(message) ||
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(message) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(message);

  // After student id answer → ask transaction id
  if (askedStudent && !askedTxn && hasStudent && !hasTxn) {
    return "Thanks. What's the Transaction ID?";
  }
  // After transaction id → ask payment date
  if (askedTxn && !askedDate && (hasTxn || hasStudent) && !hasDate) {
    return "Got it. What's the payment date?";
  }
  // Optional screenshot nudge once date is in
  if (askedDate && hasDate && !/screenshot/i.test(blob.split("payment date").pop() || "")) {
    return null; // let ticket creation in chat-service handle complete details
  }
  return null;
}

function replyPayments(
  ctx: LmsChatContext,
  message: string,
  turn: number,
  history: ChatHistoryItem[] = [],
): string {
  if (looksLikePaymentProblem(message) || /student id|transaction id|payment date/i.test(
    history.map((h) => h.content).join(" "),
  )) {
    if (!ctx.isLoggedIn) {
      return say(
        opener(ctx, "help", turn),
        `For payment problems, please sign in first: ${PAGES.login}\n\nThen tell me the issue and I'll take Student ID, Transaction ID, and payment date one by one.`,
      );
    }

    const followUp = paymentFollowUpFromHistory(message, history);
    if (followUp) {
      return say(opener(ctx, "help", turn), followUp);
    }

    if (looksLikePaymentProblem(message) && !/student id/i.test(history.map((h) => h.content).join(" "))) {
      return replyPaymentProblem(ctx, turn);
    }

    // If still mid-flow without clear next step, keep asking student id
    if (!/\bstudent\s*id\b/i.test([...history.map((h) => h.content), message].join("\n"))) {
      return replyPaymentProblem(ctx, turn);
    }

    // Details likely complete — ticket service appends the ticket number.
    return say(
      opener(ctx, "help", turn),
      "Thanks — I've got your payment details. Creating a support ticket for you now.",
    );
  }

  if (!ctx.isLoggedIn) return replyNeedLogin(ctx, "payments", turn);

  const email = ctx.learner?.email ? ` for ${ctx.learner.email}` : "";
  if (!ctx.payments.length) {
    return say(
      opener(ctx, "neutral", turn),
      `I checked payments${email} — nothing is on file yet.\n\nIf something went wrong with a payment, tell me and I'll help step by step.`,
    );
  }

  const latest = ctx.payments[0];
  const amount =
    latest.currency.toUpperCase() === "INR"
      ? `₹${(latest.amount / 100).toFixed(0)}`
      : `${latest.currency} ${(latest.amount / 100).toFixed(2)}`;
  const courses = latest.courseTitles.length ? joinNatural(latest.courseTitles) : "course purchase";
  const when = latest.paidAt ? ` · ${formatShortDate(latest.paidAt)}` : "";

  return say(
    opener(ctx, "neutral", turn),
    `Latest payment${email}: ${latest.status.toUpperCase()} — ${amount} — ${courses}${when}\n\nIf this payment has a problem, say so and I'll ask for your Student ID next.`,
  );
}

function replyAssignments(ctx: LmsChatContext, turn: number): string {
  if (!ctx.isLoggedIn) return replyNeedLogin(ctx, "assignments", turn);

  if (ctx.enrollments.length) {
    const course = ctx.enrollments[0];
    return say(
      opener(ctx, "help", turn),
      `For your account, assignments are inside each enrolled course.\n\nYou're on ${course.title} — open it and check modules/assignments there:\n${coursePath(course.slug)}\n\nAlso see: ${PAGES.assignments}`,
    );
  }

  return say(
    opener(ctx, "help", turn),
    `You're signed in, but I don't see an enrollment yet — enroll in a course first, then assignments appear in My Learning.\n\n${PAGES.courses}`,
  );
}

function replyFaq(ctx: LmsChatContext, turn: number): string {
  const areas = topCategories(ctx);
  return say(
    opener(ctx, "neutral", turn),
    `Quick FAQs:\n• Courses are self-paced in ${areas}.\n• Certificates unlock after you finish required exams.\n• Payments are handled securely at checkout.\n• For your personal courses/payments/certificates, sign in first: ${PAGES.login}\n• Tech issues: describe the problem and I can open a ticket.\n\nAsk about a specific course, payment, certificate, or assignment anytime.`,
  );
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
  if (!ctx.isLoggedIn) return replyNeedLogin(ctx, "progress", turn);

  if (ctx.enrollments.length) {
    const lines = ctx.enrollments
      .slice(0, 4)
      .map((e) => `• ${e.title}\n  Continue: ${coursePath(e.slug)}`)
      .join("\n");
    return say(
      opener(ctx, "neutral", turn),
      `Progress is saved on your account as you finish lessons and exams.\n\nYour courses:\n${lines}\n\nOpen a course to see module-by-module progress. Dashboard: ${PAGES.myLearning}`,
    );
  }

  return say(
    opener(ctx, "neutral", turn),
    `You're signed in, but there's no enrollment yet — enroll first and progress will track automatically.\n\n${PAGES.courses}`,
  );
}

function replyLogin(ctx: LmsChatContext, turn: number): string {
  if (ctx.isLoggedIn) {
    const name = learnerName(ctx);
    const email = ctx.learner?.email ?? "your account";
    return say(
      opener(ctx, "neutral", turn),
      `${name ? `${name}, you're` : "You're"} already signed in as ${email}.\n\nAsk me about your courses, certificates, payments, or progress and I'll look them up from your account.`,
    );
  }
  return say(
    opener(ctx, "help", turn),
    `Sign in with the email you registered with (or Continue with Google if you used Google).\n\nLogin: ${PAGES.login}\n\nOnce you're in, come back here and ask — I'll show your real courses, payments, and certificates.`,
  );
}

function replyVideoIssue(ctx: LmsChatContext, turn: number): string {
  const accountHint = ctx.isLoggedIn
    ? ctx.enrollments.length
      ? `\n\nYou're enrolled in ${ctx.enrollments[0].title} — try opening that lesson again: ${coursePath(ctx.enrollments[0].slug)}`
      : ""
    : `\n\nIf this is on a purchased course, sign in first so I can check your enrollment: ${PAGES.login}`;
  return say(
    opener(ctx, "help", turn),
    `Try a quick refresh, then Chrome or Edge with ad-blockers off.${accountHint}\n\nStill stuck? Say "create a ticket" with the course name and I'll escalate.`,
  );
}

function replySupportIssues(ctx: LmsChatContext, turn: number): string {
  if (!ctx.isLoggedIn) return replyNeedLogin(ctx, "support", turn);

  if (!ctx.supportIssues.length) {
    return say(
      opener(ctx, "help", turn),
      `No open tickets on your account (${ctx.learner?.email ?? "signed in"}). Describe the issue and I'll try to help — or say "create a ticket" to escalate.`,
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
  const name = learnerName(ctx);
  if (!ctx.categories.length) {
    return say(opener(ctx, "neutral", turn), `Browse our catalog at ${PAGES.courses}`);
  }

  if (ctx.matchedCategory && ctx.categoryMatchedCourses.length) {
    const cat = ctx.categories.find((c) => c.slug === ctx.matchedCategory);
    const label = cat?.label ?? fmtCategory(ctx.matchedCategory);
    return say(
      opener(ctx, "neutral", turn),
      `${name ? `${name}, here` : "Here"} are our ${label} courses:\n\n${describeCoursesWithPrices(ctx.categoryMatchedCourses, 6)}\n\nSee the full ${label} category: ${cat?.categoryPath ?? `/courses/category/${ctx.matchedCategory}`}\n\nWhich one would you like to know more about?`,
    );
  }

  const catList = ctx.categories
    .map((c) => `• ${c.label} — ${c.count} course${c.count === 1 ? "" : "s"}`)
    .join("\n");

  return say(
    opener(ctx, "warm", turn),
    `Happy to share our LMS course catalog.\n\nWe organise training into these categories:\n\n${catList}\n\nWhich area interests you — for example Cyber Security, ESG, Food Safety, or Information Security? I'll list the courses with prices for that category.`,
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
  const name = learnerName(ctx);

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
  history: ChatHistoryItem[] = [],
): string {
  if (!ctx.isLoggedIn && ACCOUNT_TOPICS.has(topic)) {
    return replyNeedLogin(ctx, topic, turn);
  }

  switch (topic) {
    case "certificates":
      return replyCertificates(ctx, turn);
    case "enrollments":
      return replyEnrollments(ctx, turn);
    case "payments":
      return replyPayments(ctx, message, turn, history);
    case "assignments":
      return replyAssignments(ctx, turn);
    case "faq":
      return replyFaq(ctx, turn);
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
  // Keep payment ticket intake on payments topic while collecting details turn-by-turn.
  const paymentFlow =
    /student id|transaction id|payment date|payment problem|payment issue/i.test(
      history.map((h) => h.content).join(" "),
    ) || looksLikePaymentProblem(trimmed);
  const effectiveTopic = paymentFlow && ctx.isLoggedIn ? "payments" : topic;
  return buildReply(effectiveTopic, ctx, trimmed, turn, history);
}

/** Relative paths the chat UI can render as clickable links. */
export { PAGES as CHAT_PAGE_PATHS };
