/** Map free-text (YouTube titles, descriptions) to LMS learning interests. */

import { LEARNING_INTEREST_OPTIONS } from "@/lib/learner-learning-preferences";

const TOPIC_RULES: Array<{
  pattern: RegExp;
  interests: string[];
  keywords: string[];
}> = [
  {
    pattern: /food|haccp|fssc|fraud|beverage|dairy|bakery|nutrition|hygiene|restaurant|catering|fsma/i,
    interests: ["Food Safety & HACCP", "Food Fraud & Mitigation"],
    keywords: ["food safety", "haccp", "food fraud"],
  },
  {
    pattern: /cyber|security|hacking|infosec|network|malware|phishing|penetration|soc\b|firewall/i,
    interests: ["Cybersecurity"],
    keywords: ["cybersecurity", "information security"],
  },
  {
    pattern: /compliance|audit|iso\s*9001|iso\s*22000|regulatory|governance|risk management|gdpr/i,
    interests: ["Compliance & Auditing"],
    keywords: ["compliance", "auditing"],
  },
  {
    pattern: /quality|six sigma|lean|process improvement|kaizen|iso/i,
    interests: ["Quality Management"],
    keywords: ["quality management"],
  },
  {
    pattern: /leadership|management|soft skills|coaching|team building|productivity/i,
    interests: ["Leadership & Management"],
    keywords: ["leadership", "management"],
  },
  {
    pattern: /health|safety|osha|workplace|hse|ppe|incident/i,
    interests: ["Health & Safety"],
    keywords: ["health and safety"],
  },
  {
    pattern: /sustain|climate|esg|carbon|renewable|green energy|environment/i,
    interests: ["Sustainability"],
    keywords: ["sustainability"],
  },
];

const VALID_INTERESTS = new Set<string>(LEARNING_INTEREST_OPTIONS);

export function inferInterestsFromYoutubeText(text: string): {
  interests: string[];
  keywords: string[];
} {
  const interests = new Set<string>();
  const keywords = new Set<string>();
  const blob = text.trim();
  if (!blob) return { interests: [], keywords: [] };

  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(blob)) {
      rule.interests.forEach((i) => {
        if (VALID_INTERESTS.has(i)) interests.add(i);
      });
      rule.keywords.forEach((k) => keywords.add(k));
    }
  }

  return {
    interests: [...interests],
    keywords: [...keywords],
  };
}

export function inferInterestsFromYoutubeCorpus(lines: string[]): {
  interests: string[];
  keywords: string[];
  topChannels: string[];
} {
  const corpus = lines.filter(Boolean).join("\n");
  const { interests, keywords } = inferInterestsFromYoutubeText(corpus);
  return { interests, keywords, topChannels: [] };
}
