'use server';

import { generateSummaryAndAnalysis } from '@/ai/flows/generate-summary-and-analysis';
import { suggestAlternativeURLs } from '@/ai/flows/suggest-alternative-urls';
import { calculateScore } from '@/lib/scoring';
import type { AnalysisData, FormState } from '@/lib/types';
import { calculateFleschReadingEase, countLoadedLanguage, countExcessivePunctuation, computeAllCapsRatio, extractLargestTextBlock, normalizeWhitespace } from '@/lib/text-analysis';
import * as cheerio from 'cheerio';

type OpinionDetection = {
  isOpinion: boolean;
  hasExplicitLabel: boolean;
};

const CORRECTIONS_KEYWORDS = ['corrections', 'correction policy', 'errata', 'erratum', 'retractions'];
const OWNERSHIP_KEYWORDS = ['about us', 'our mission', 'ownership', 'funding', 'who we are', 'masthead', 'advertising disclosure', 'sponsors', 'transparency'];
const OPINION_INDICATORS = ['opinion', 'editorial', 'commentary', 'analysis', 'perspective'];

function isGenericAuthorName(author: string | null): boolean {
  if (!author) return true;
  const normalized = author.toLowerCase();
  const genericTerms = ['staff', 'team', 'editorial', 'newsroom', 'desk', 'anonymous', 'unknown'];
  return genericTerms.some(term => normalized.includes(term));
}

function detectPolicyLink($: cheerio.CheerioAPI, keywords: string[]): boolean {
  return $('a[href]').toArray().some((anchor) => {
    const element = $(anchor);
    const text = normalizeWhitespace(element.text().toLowerCase());
    const href = element.attr('href')?.toLowerCase() ?? '';
    return keywords.some(keyword => text.includes(keyword) || href.includes(keyword.replace(/\s+/g, '-')));
  });
}

function detectAuthorBioLink($: cheerio.CheerioAPI, author: string | null): boolean {
  if (!author) return false;
  const normalizedAuthor = author.toLowerCase();
  return $('a[href]').toArray().some((anchor) => {
    const element = $(anchor);
    const href = element.attr('href')?.toLowerCase() ?? '';
    const text = normalizeWhitespace(element.text().toLowerCase());
    if (!href && !text) return false;
    const authorMatch = normalizedAuthor && (text.includes(normalizedAuthor) || href.includes('/author/') || href.includes('/writers/'));
    const bioMatch = text.includes('bio') || text.includes('about the author') || href.includes('bio');
    return authorMatch && bioMatch;
  });
}

function extractMainContent($: cheerio.CheerioAPI): string {
  $('script, style, nav, header, footer, aside, form, [role="navigation"], [role="search"], .ad, .advert, noscript').remove();

  const candidateSelectors = [
    'article',
    'main',
    '[role="main"]',
    '#content',
    '#main',
    '.article-body',
    '.post-content',
    '.entry-content',
    '.story-content',
  ];

  const candidates: string[] = candidateSelectors
    .map(selector => $(selector).text())
    .filter(Boolean);

  if (candidates.length === 0) {
    const paragraphs = $('p').toArray().map(p => $(p).text()).filter(Boolean);
    candidates.push(paragraphs.join(' '));
  }

  if (candidates.length === 0) {
    candidates.push($('body').text());
  }

  const largestBlock = extractLargestTextBlock(candidates);
  return normalizeWhitespace(largestBlock).substring(0, 8000);
}

function computeAdvertisementDensity($: cheerio.CheerioAPI, adCount: number): number {
  const contentBlocks = $('p, article, section, div').length || 1;
  return Math.min(adCount / contentBlocks, 1);
}

function detectOpinionSignals($: cheerio.CheerioAPI, title: string, content: string): OpinionDetection {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  const metaSection = $('meta[property="article:section"]').attr('content')?.toLowerCase() ?? '';
  const metaType = $('meta[name="type"]').attr('content')?.toLowerCase() ?? '';

  const isOpinion = OPINION_INDICATORS.some(keyword => lowerContent.includes(keyword));
  const hasLabelInTitle = OPINION_INDICATORS.some(keyword => lowerTitle.startsWith(`${keyword}:`) || lowerTitle.includes(`${keyword}:`) || lowerTitle.startsWith(keyword + ' '));
  const hasLabelInMeta = OPINION_INDICATORS.some(keyword => metaSection.includes(keyword) || metaType.includes(keyword));

  return {
    isOpinion,
    hasExplicitLabel: hasLabelInTitle || hasLabelInMeta,
  };
}

function detectOpinionSignalsFromText(title: string, content: string): OpinionDetection {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  const isOpinion = OPINION_INDICATORS.some(keyword => lowerContent.includes(keyword));
  const hasLabelInTitle = OPINION_INDICATORS.some(keyword => lowerTitle.startsWith(`${keyword}:`) || lowerTitle.includes(`${keyword}:`) || lowerTitle.startsWith(keyword + ' '));

  return {
    isOpinion,
    hasExplicitLabel: hasLabelInTitle,
  };
}

async function scrapeUrl(url: string): Promise<AnalysisData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // Improved author extraction
    let author: string | null = null;
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="author"]',
      'meta[name="twitter:creator"]',
      'meta[property="article:author"]',
    ];
    for (const selector of authorSelectors) {
      author = $(selector).attr('content') || null;
      if (author) break;
    }
    
    if (!author) {
      try {
        $('script[type="application/ld+json"]').each((i, el) => {
          const jsonLd = $(el).html();
          if (jsonLd) {
            const data = JSON.parse(jsonLd);
            if (Array.isArray(data)) {
              for (const item of data) {
                  // Handle nested @graph arrays, common in news sites
                  const graphData = item['@graph'] ? item['@graph'].find((g: any) => g['@type'] === 'NewsArticle' || g['@type'] === 'Article') : item;
                  if(graphData && graphData.author && graphData.author.name) {
                    author = graphData.author.name;
                    return false; // break the loop
                  }
              }
            } else {
               // Handle single objects and objects with a @graph array
               const graphData = data['@graph'] ? data['@graph'].find((g: any) => g['@type'] === 'NewsArticle' || g['@type'] === 'Article') : data;
               if (graphData && graphData.author && graphData.author.name) {
                author = graphData.author.name;
                return false; // break the loop
              } else if (graphData && graphData.publisher && graphData.publisher.name) {
                author = graphData.publisher.name; // Fallback to publisher
                return false; // break the loop
              }
            }
          }
        });
      } catch (e) { /* Ignore parsing errors */ }
    }

    if(!author) {
      author = $('[rel="author"], a[class*="author"], a[href*="/author/"], .byline, .author-name, .writer-name').first().text().trim() || null;
      if (author && author.toLowerCase().startsWith('by ')) {
        author = author.substring(3).trim();
      }
    }


    let publicationDate = $('meta[property="article:published_time"]').attr('content') || $('time').attr('datetime') || null;

    // Fallback for WeChat and similar sites storing date in script tags
    if (!publicationDate) {
      try {
        const scriptContent = $('script[type="text/javascript"]').text();
        const dateRegex = /(?:var\s+)?(?:publish_time|ct|create_time)\s*=\s*["']?(\d{10})["']?/;
        const match = scriptContent.match(dateRegex);
        if (match && match[1]) {
          const timestamp = parseInt(match[1], 10) * 1000;
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            publicationDate = date.toISOString();
          }
        }
      } catch(e) { /* Ignore script parsing errors */ }
    }

    const content = extractMainContent($);

    // Find author from content as a last resort
    if (!author) {
        const bylineRegex = /by\s+([a-z\s.'-]+)/i;
        const matches = content.substring(0, 250).match(bylineRegex); // Search first 250 chars
        if (matches && matches[1]) {
            const potentialAuthor = matches[1].split(/[\n|\/]/)[0].trim();
            // Basic validation to avoid grabbing random text
            if (potentialAuthor.length < 50 && potentialAuthor.split(' ').length < 5) {
                author = potentialAuthor;
            }
        }
    }


    const urlObject = new URL(url);
    const domain = urlObject.hostname;
    const title = normalizeWhitespace($('title').first().text() || url);
    author = author ? normalizeWhitespace(author) : null;


    // Heuristics for site type
    let siteType: AnalysisData['siteType'] = 'Unknown';
    if (domain.includes('wikipedia.org')) siteType = 'Encyclopedia';
    else if (domain.match(/reuters|news|bbc|cnn|apnews|washingtonpost|nytimes|wsj|theguardian|forbes|bloomberg/)) siteType = 'News';
    else if (domain.match(/blog|medium|substack|wordpress/)) siteType = 'Blog';
    else if (domain.match(/science|nature|cell|plos|arxiv|pubmed/)) siteType = 'Science';

    // Infer site type from author if unknown
    if (siteType === 'Unknown' && author) {
        const lowerCaseAuthor = author.toLowerCase();
        if (lowerCaseAuthor.includes('reuters') || lowerCaseAuthor.includes('associated press') || lowerCaseAuthor.includes('washington post') || lowerCaseAuthor.includes('new york times')) {
            siteType = 'News';
        }
    }

    const correctionsPolicyFound = detectPolicyLink($, CORRECTIONS_KEYWORDS);
    const ownershipDisclosureFound = detectPolicyLink($, OWNERSHIP_KEYWORDS);
    const hasAuthorBioLink = detectAuthorBioLink($, author);
    const authorIsGeneric = isGenericAuthorName(author);

    const allAnchors = $('a[href]');
    const externalLinks = allAnchors.filter((_, el) => {
      const href = $(el).attr('href') ?? '';
      if (!href) return false;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
      if (!href.startsWith('http')) return false;
      return !href.includes(domain);
    }).length;

    const internalLinks = allAnchors.length - externalLinks;

    const adElements = $('[class*="ad"], [id*="ad"], .advertisement, .sponsored, [data-ad], iframe[src*="ads"], .sponsor').length;
    const adCount = adElements;
    const advertisementDensity = computeAdvertisementDensity($, adCount);

    const readabilityScore = calculateFleschReadingEase(content);
    const loadedLanguageCount = countLoadedLanguage(content);
    const titleAndHeadings = `${title} ${$('h1, h2').text()}`;
    const excessivePunctuationCount = countExcessivePunctuation(titleAndHeadings);
    const headlineAllCapsRatio = computeAllCapsRatio(title);

    const { isOpinion, hasExplicitLabel } = detectOpinionSignals($, title, content);

    return {
      url,
      title,
      author,
      publicationDate,
      siteType,
      linkCount: allAnchors.length,
      externalLinkCount: externalLinks,
      internalLinkCount: internalLinks,
      adCount,
      advertisementDensity,
      hasCitations: /references|sources|citations/i.test(content),
      correctionsPolicyFound,
      ownershipDisclosureFound,
      hasAuthorBioLink,
      authorIsGeneric,
      loadedLanguageCount,
      excessivePunctuationCount,
      headlineAllCapsRatio,
      readabilityScore,
      isOpinionOrEditorial: isOpinion,
      opinionLabelDetected: hasExplicitLabel,
      content: content.substring(0, 5000), // Limit content size for AI analysis
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('The request timed out after 15 seconds.');
    }
    throw error;
  }
}


export async function analyzeUrlAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const rawUrl = formData.get('url');
  
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) {
      return {
          status: 'error',
          message: 'Please enter a valid URL, including https://',
      };
  }

  try {
    const scrapedData = await scrapeUrl(rawUrl);
    const analysisResult = calculateScore(scrapedData);

    return {
      status: 'success',
      message: 'Analysis complete.',
      result: analysisResult,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(error);
    if(message.includes('403') || message.includes('timed out')) {
        return { status: 'error', message: `This website is blocking automated analysis. (${message}) Try pasting the text manually.` };
    }
    return {
      status: 'error',
      message: `Failed to analyze the URL: ${message}`,
    };
  }
}

export async function analyzeTextAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const text = formData.get('text');

  if (typeof text !== 'string' || text.length < 100) {
      return {
          status: 'error',
          message: 'Please paste at least 100 characters of text to analyze.',
      };
  }
  
  try {
    // Detect Author
    let author: string | null = null;
    const bylineRegex = /by\s+([a-z\s.'-]+)/i; 
    const matches = text.substring(0, 500).match(bylineRegex);
    if(matches && matches[1]) {
      const potentialAuthor = matches[1].split(/[\n|\/]/)[0].trim();
      if(potentialAuthor.length < 50 && potentialAuthor.split(' ').length < 5) {
         author = potentialAuthor;
      }
    }
     if (!author) {
      author = 'Unknown (Manual Input)';
    }

    
    // Detect Site Type from content
    const lowercasedText = text.toLowerCase();
    let siteType: AnalysisData['siteType'] = 'Unknown';
    if (lowercasedText.includes('reuters') || lowercasedText.includes('associated press') || lowercasedText.includes('washington post') || lowercasedText.includes('new york times')) {
      siteType = 'News';
    } else if (lowercasedText.includes('wikipedia')) {
      siteType = 'Encyclopedia';
    } else if (lowercasedText.includes('nature') || lowercasedText.includes('science journal') || lowercasedText.includes('cell press') || lowercasedText.includes('pubmed')) {
      siteType = 'Science';
    }

    const title = `${normalizeWhitespace(text.substring(0, 120))}... (Pasted Text)`;

    const readabilityScore = calculateFleschReadingEase(text);
    const loadedLanguageCount = countLoadedLanguage(text);
    const excessivePunctuationCount = countExcessivePunctuation(title);
    const headlineAllCapsRatio = computeAllCapsRatio(title);
    const correctionsPolicyFound = CORRECTIONS_KEYWORDS.some(keyword => text.toLowerCase().includes(keyword));
    const ownershipDisclosureFound = OWNERSHIP_KEYWORDS.some(keyword => text.toLowerCase().includes(keyword));
    const { isOpinion, hasExplicitLabel } = detectOpinionSignalsFromText(title, text);

    const linkMatches = text.match(/https?:\/\//gi) || [];
    const externalLinkCount = linkMatches.length;

    const manualData: AnalysisData = {
      url: `manual-text-${Date.now()}`,
      title,
      author: author,
      publicationDate: new Date().toISOString(),
      siteType: siteType,
      linkCount: externalLinkCount,
      externalLinkCount,
      internalLinkCount: 0,
      adCount: 0,
      advertisementDensity: 0,
      hasCitations: /references|sources|citations/i.test(text),
      correctionsPolicyFound,
      ownershipDisclosureFound,
      hasAuthorBioLink: false,
      authorIsGeneric: isGenericAuthorName(author),
      loadedLanguageCount,
      excessivePunctuationCount,
      headlineAllCapsRatio,
      readabilityScore,
      isOpinionOrEditorial: isOpinion,
      opinionLabelDetected: hasExplicitLabel,
      content: text.substring(0, 5000),
    };
    
    const analysisResult = calculateScore(manualData);
    
     return {
      status: 'success',
      message: 'Manual text analysis complete.',
      result: analysisResult,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(error);
    return {
      status: 'error',
      message: `Failed to analyze the text: ${message}`,
    };
  }
}


export async function getAiAnalysisAction(analysisDataString: string) {
  const analysisData: AnalysisData = JSON.parse(analysisDataString);
  try {
    const dataForAI = {
      URL: analysisData.url.startsWith('manual-text') ? 'Manually Pasted Text' : analysisData.url,
      'Article Title': analysisData.title,
      Author: analysisData.author || 'Not available',
      'Site Type': analysisData.siteType,
      'Has Citations Keyword Match': analysisData.hasCitations,
      'External Links Detected': analysisData.externalLinkCount,
      'Internal Links Detected': analysisData.internalLinkCount,
      'Corrections Policy Found': analysisData.correctionsPolicyFound,
      'Ownership Disclosure Found': analysisData.ownershipDisclosureFound,
      'Author Bio Link Present': analysisData.hasAuthorBioLink,
      'Ad Count': analysisData.adCount,
      'Ad Density Estimate': analysisData.advertisementDensity,
      'Readability (Flesch)': analysisData.readabilityScore,
      'Loaded Language Count': analysisData.loadedLanguageCount,
      'Content Snippet': analysisData.content.substring(0, 2000), // Pass a snippet
    };

    const result = await generateSummaryAndAnalysis({ analyzedData: JSON.stringify(dataForAI, null, 2) });
    
    return { status: 'success' as const, analysis: result };

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { status: 'error' as const, message: 'Could not generate AI analysis. The model may be unavailable or experiencing high load.' };
  }
}

export async function suggestAlternativesAction(topic: string, currentUrl: string) {
  try {
    const result = await suggestAlternativeURLs({ topic, currentUrl });
    if (!result.alternativeUrls || result.alternativeUrls.length === 0) {
      return { status: 'success' as const, urls: [] };
    }
    return { status: 'success' as const, urls: result.alternativeUrls };
  } catch(error) {
    console.error("Suggest Alternatives Error:", error);
    return { status: 'error' as const, message: 'Could not generate alternative URLs.' };
  }
}
