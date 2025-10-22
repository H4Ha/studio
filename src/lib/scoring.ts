import {
  User,
  Calendar,
  BookOpen,
  Link2,
  DollarSign,
  CheckCircle,
  Shield,
  type LucideIcon
} from "lucide-react";
import type { AnalysisData, ScoreModifier, AnalysisResult } from "@/lib/types";
import { differenceInYears } from 'date-fns';

const MOCK_DB: Record<string, AnalysisData> = {
  'wikipedia.org': {
    url: 'https://www.wikipedia.org/',
    author: "Community",
    publicationDate: new Date().toISOString(),
    siteType: 'Encyclopedia',
    linkCount: 500,
    externalLinkCount: 150,
    adCount: 0,
    hasCitations: true,
    domainAgeDays: 8450, // ~23 years
    content: `Wikipedia is a free online encyclopedia, created and edited by volunteers around the world and hosted by the Wikimedia Foundation. It contains articles on a wide variety of subjects.`,
  },
  'bbc.com': {
    url: 'https://www.bbc.com/news',
    author: "BBC News",
    publicationDate: new Date().toISOString(),
    siteType: 'News',
    linkCount: 200,
    externalLinkCount: 50,
    adCount: 4,
    hasCitations: true,
    domainAgeDays: 9800, // ~26 years
    content: `The BBC is the world's leading public service broadcaster. We're impartial and independent, and every day we create distinctive, world-class programmes and content which inform, educate and entertain millions of people in the UK and around theworld.`,
  },
  'personal-blog.example.com': {
    url: 'https://personal-blog.example.com',
    author: "Jane Doe",
    publicationDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString(),
    siteType: 'Blog',
    linkCount: 15,
    externalLinkCount: 5,
    adCount: 8,
    hasCitations: false,
    domainAgeDays: 730, // 2 years
    content: `This is my personal blog where I write about my travel adventures. Yesterday, I went to the mountains. It was great. I saw a bird. The end.`,
  },
  'science-journal.example.com': {
    url: 'https://science-journal.example.com',
    author: "Dr. John Smith, PhD",
    publicationDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(),
    siteType: 'Science',
    linkCount: 25,
    externalLinkCount: 18,
    adCount: 1,
    hasCitations: true,
    domainAgeDays: 1825, // 5 years
    content: 'This paper presents a new method for analyzing cellular structures using quantum computing. Our results show a 50% improvement in accuracy over existing methods. The study was peer-reviewed.',
  },
};

const DEFAULT_MOCK_DATA: AnalysisData = {
  url: 'https://example.com',
  author: null,
  publicationDate: new Date(new Date().setFullYear(new Date().getFullYear() - 7)).toISOString(),
  siteType: 'Unknown',
  linkCount: 5,
  externalLinkCount: 1,
  adCount: 12,
  hasCitations: false,
  domainAgeDays: 300,
  content: 'This website is a generic example. The content is sparse and provides little value. It is unclear who wrote it or when. There are many ads.',
};

export function getMockAnalysisData(url: string): AnalysisData {
  try {
    const urlObject = new URL(url);
    const domain = urlObject.hostname.replace('www.', '');

    for (const mockDomain in MOCK_DB) {
      if (domain.includes(mockDomain)) {
        return { ...MOCK_DB[mockDomain], url };
      }
    }
  } catch (error) {
    // Invalid URL, return default for scoring.
    return { ...DEFAULT_MOCK_DATA, url };
  }
  
  return { ...DEFAULT_MOCK_DATA, url };
}

export function calculateScore(data: AnalysisData): AnalysisResult {
  let score = 50;
  const modifiers: ScoreModifier[] = [];

  // Author
  if (data.author) {
    const change = data.author.includes('Dr.') || data.author.includes('PhD') ? 15 : 10;
    score += change;
    modifiers.push({ factor: 'Author', change, reason: `Author "${data.author}" identified, indicating accountability.`, icon: User });
  } else {
    score -= 10;
    modifiers.push({ factor: 'Author', change: -10, reason: 'No clear author or publisher found, reducing credibility.', icon: User });
  }

  // Publication Date
  if (data.publicationDate) {
    const pubDate = new Date(data.publicationDate);
    const yearsAgo = differenceInYears(new Date(), pubDate);
    if (yearsAgo < 1) {
      score += 10;
      modifiers.push({ factor: 'Freshness', change: 10, reason: 'Content is very recent (published within the last year).', icon: Calendar });
    } else if (yearsAgo > 5) {
      score -= 15;
      modifiers.push({ factor: 'Freshness', change: -15, reason: `Content is outdated (published over ${yearsAgo} years ago).`, icon: Calendar });
    } else {
      score += 5;
      modifiers.push({ factor: 'Freshness', change: 5, reason: `Content is relatively recent (published ${yearsAgo} years ago).`, icon: Calendar });
    }
  } else {
    score -= 5;
    modifiers.push({ factor: 'Freshness', change: -5, reason: 'No publication date found.', icon: Calendar });
  }

  // Site Type
  const siteTypeMap: Record<AnalysisData['siteType'], { change: number; reason: string }> = {
    'Encyclopedia': { change: 15, reason: 'Encyclopedia format often implies structured, vetted information.' },
    'News': { change: 5, reason: 'Established news sources follow journalistic standards.' },
    'Blog': { change: -10, reason: 'Blogs are often opinion-based and less rigorous.' },
    'Forum': { change: -15, reason: 'Forum content is user-generated and highly variable in quality.' },
    'Science': { change: 20, reason: 'Scientific journals suggest peer-reviewed, evidence-based content.' },
    'Unknown': { change: -5, reason: 'The type of site could not be determined.' },
  }
  const siteTypeMod = siteTypeMap[data.siteType];
  score += siteTypeMod.change;
  modifiers.push({ factor: 'Site Type', ...siteTypeMod, icon: BookOpen });

  // Citations
  if (data.hasCitations) {
    score += 20;
    modifiers.push({ factor: 'Citations', change: 20, reason: 'Sources and citations are present, supporting claims.', icon: CheckCircle });
  } else {
    score -= 10;
    modifiers.push({ factor: 'Citations', change: -10, reason: 'No citations or links to supporting evidence found.', icon: CheckCircle });
  }

  // Ads
  if (data.adCount === 0) {
    score += 5;
    modifiers.push({ factor: 'Ad Presence', change: 5, reason: 'No ads found, suggesting a non-commercial focus.', icon: DollarSign });
  } else if (data.adCount > 5) {
    const change = -Math.min(data.adCount, 15);
    score += change;
    modifiers.push({ factor: 'Ad Presence', change, reason: `High number of ads (${data.adCount}) may indicate a primary focus on revenue over content.`, icon: DollarSign });
  }
  
  // External Links
  if (data.externalLinkCount > 10) {
    const change = Math.min(Math.floor(data.externalLinkCount / 5), 15);
    score += change;
    modifiers.push({ factor: 'External Links', change, reason: `Numerous external links (${data.externalLinkCount}) suggest a well-referenced article.`, icon: Link2 });
  }
  
  // Domain Age
  if (data.domainAgeDays > 365 * 2) {
    score += 10;
    modifiers.push({ factor: 'Domain Age', change: 10, reason: `Established domain (over 2 years old) suggests stability.`, icon: Shield });
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    modifiers,
    data
  };
}
