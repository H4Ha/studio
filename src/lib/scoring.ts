import type { AnalysisData, ScoreModifier, AnalysisResult } from "@/lib/types";
import { differenceInYears, isValid } from 'date-fns';

export function calculateScore(data: AnalysisData): AnalysisResult {
  let score = 50;
  const modifiers: ScoreModifier[] = [];

  // Author
  if (data.author) {
    const change = data.author.includes('Dr.') || data.author.includes('PhD') ? 15 : 10;
    score += change;
    modifiers.push({ factor: 'Author', change, reason: `Author "${data.author}" identified, indicating accountability.`, icon: 'User' });
  } else {
    score -= 10;
    modifiers.push({ factor: 'Author', change: -10, reason: 'No clear author or publisher found, reducing credibility.', icon: 'UserCircle' });
  }

  // Publication Date
  if (data.publicationDate) {
    const pubDate = new Date(data.publicationDate);
    if(isValid(pubDate)) {
      const yearsAgo = differenceInYears(new Date(), pubDate);
      if (yearsAgo < 1) {
        score += 10;
        modifiers.push({ factor: 'Freshness', change: 10, reason: 'Content is very recent (published within the last year).', icon: 'CalendarCheck' });
      } else if (yearsAgo > 5) {
        score -= 15;
        modifiers.push({ factor: 'Freshness', change: -15, reason: `Content is outdated (published over ${yearsAgo} years ago).`, icon: 'CalendarX' });
      } else {
        score += 5;
        modifiers.push({ factor: 'Freshness', change: 5, reason: `Content is relatively recent (published ${yearsAgo} years ago).`, icon: 'CalendarClock' });
      }
    } else {
      score -= 5;
      modifiers.push({ factor: 'Freshness', change: -5, reason: 'Publication date found but could not be parsed.', icon: 'CalendarX' });
    }
  } else {
    score -= 10;
    modifiers.push({ factor: 'Freshness', change: -10, reason: 'No publication date found.', icon: 'CalendarX' });
  }

  // Site Type
  const siteTypeMap: Record<AnalysisData['siteType'], { change: number; reason: string }> = {
    'Encyclopedia': { change: 15, reason: 'Encyclopedia format often implies structured, vetted information.' },
    'News': { change: 5, reason: 'Established news sources often follow journalistic standards.' },
    'Blog': { change: -10, reason: 'Blogs are often opinion-based and less rigorous.' },
    'Forum': { change: -15, reason: 'Forum content is user-generated and highly variable in quality.' },
    'Science': { change: 20, reason: 'Scientific journals suggest peer-reviewed, evidence-based content.' },
    'Unknown': { change: -5, reason: 'The type of site could not be determined, suggesting a lack of clear focus.' },
  }
  const siteTypeMod = siteTypeMap[data.siteType];
  score += siteTypeMod.change;
  modifiers.push({ factor: 'Site Type', ...siteTypeMod, icon: 'BookOpen' });

  // Citations
  if (data.hasCitations) {
    score += 20;
    modifiers.push({ factor: 'Citations', change: 20, reason: 'The presence of "sources" or "references" suggests supporting evidence.', icon: 'Quote' });
  } else {
    score -= 10;
    modifiers.push({ factor: 'Citations', change: -10, reason: 'No clear citations or links to supporting evidence found.', icon: 'Quote' });
  }

  // Ads
  if (data.adCount === 0) {
    score += 5;
    modifiers.push({ factor: 'Ad Presence', change: 5, reason: 'No ads detected, suggesting a non-commercial focus.', icon: 'BadgeDollarSign' });
  } else if (data.adCount > 5) {
    const change = -Math.min(data.adCount * 2, 15);
    score += change;
    modifiers.push({ factor: 'Ad Presence', change, reason: `High number of ads (${data.adCount}) may indicate a primary focus on revenue over content.`, icon: 'BadgeDollarSign' });
  }
  
  // External Links
  if (data.externalLinkCount > 10) {
    const change = Math.min(Math.floor(data.externalLinkCount / 5), 15);
    score += change;
    modifiers.push({ factor: 'External Links', change, reason: `Numerous external links (${data.externalLinkCount}) suggest a well-referenced article.`, icon: 'Link' });
  } else if (data.externalLinkCount < 2) {
      score -= 5;
      modifiers.push({ factor: 'External Links', change: -5, reason: 'Very few external links, which may indicate a lack of external sources.', icon: 'Link' });
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    modifiers,
    data
  };
}
