'use server';

import { generateSummaryAndAnalysis } from '@/ai/flows/generate-summary-and-analysis';
import { suggestAlternativeURLs } from '@/ai/flows/suggest-alternative-urls';
import { calculateScore } from '@/lib/scoring';
import type { AnalysisData, FormState } from '@/lib/types';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const urlSchema = z.string().url({ message: 'Please enter a valid URL, including https://' });
const textSchema = z.string().min(100, { message: 'Please paste at least 100 characters of text to analyze.' });

async function scrapeUrl(url: string): Promise<AnalysisData> {
  const response = await fetch(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
    },
  });
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
            const graphData = data.find(item => item['@type'] === 'NewsArticle' || item['@type'] === 'Article');
            if(graphData && graphData.author && graphData.author.name) {
              author = graphData.author.name;
              return false; // break the loop
            }
          } else {
             if (data.author && data.author.name) {
              author = data.author.name;
              return false; // break the loop
            } else if (data.publisher && data.publisher.name) {
              author = data.publisher.name; // Fallback to publisher
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


  const publicationDate = $('meta[property="article:published_time"]').attr('content') || $('time').attr('datetime') || null;

  // Improved content extraction
  // Try to find the main content in common article containers
  let mainContent = $('article').text() || $('[role="main"]').text() || $('main').text();
  
  if (!mainContent) {
    // A more generic attempt if specific tags fail
    mainContent = $('#content, #main, .post-content, .article-body, .story-content').text();
  }
  
  // If specific containers aren't found, fall back to the body but clean it up
  if (!mainContent || mainContent.length < 200) {
    $('script, style, nav, header, footer, aside, form, [role="navigation"], [role="search"], .ad, .advert').remove();
    mainContent = $('body').text();
  }
  
  const content = mainContent.replace(/\s+/g, ' ').trim();


  const urlObject = new URL(url);
  const domain = urlObject.hostname;

  // Heuristics for site type
  let siteType: AnalysisData['siteType'] = 'Unknown';
  if (domain.includes('wikipedia.org')) siteType = 'Encyclopedia';
  else if (domain.match(/reuters|news|bbc|cnn|apnews/)) siteType = 'News';
  else if (domain.match(/blog|medium/)) siteType = 'Blog';
  else if (domain.match(/science|nature|cell|plos/)) siteType = 'Science';

  return {
    url,
    author,
    publicationDate,
    siteType,
    linkCount: $('a').length,
    externalLinkCount: $(`a[href^="http"]`).filter((i, el) => !$(el).attr('href')?.includes(domain)).length,
    adCount: $('iframe[src*="ads"]').length + $('.ad, .advert, [id*="ad-"]').length,
    hasCitations: /references|sources|citations/i.test(content),
    content: content.substring(0, 5000), // Limit content size for AI analysis
  };
}


export async function analyzeUrlAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const rawUrl = formData.get('url');

  const validatedUrl = urlSchema.safeParse(rawUrl);

  if (!validatedUrl.success) {
    return {
      status: 'error',
      message: validatedUrl.error.errors[0].message,
    };
  }

  try {
    const scrapedData = await scrapeUrl(validatedUrl.data);
    const analysisResult = calculateScore(scrapedData);

    return {
      status: 'success',
      message: 'Analysis complete.',
      result: analysisResult,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(error);
    if(message.includes('403')) {
        return { status: 'error', message: 'This website is blocking automated analysis (403 Forbidden). Try pasting the text manually.' };
    }
    return {
      status: 'error',
      message: `Failed to analyze the URL: ${message}`,
    };
  }
}

export async function analyzeTextAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const text = formData.get('text');

  const validatedText = textSchema.safeParse(text);

  if (!validatedText.success) {
    return {
      status: 'error',
      message: validatedText.error.errors[0].message,
    };
  }
  
  try {
     const manualData: AnalysisData = {
      url: `manual-text-${Date.now()}`,
      author: 'Unknown (Manual Input)',
      publicationDate: new Date().toISOString(),
      siteType: 'Unknown',
      linkCount: (validatedText.data.match(/http/g) || []).length,
      externalLinkCount: (validatedText.data.match(/http/g) || []).length,
      adCount: 0,
      hasCitations: /references|sources|citations/i.test(validatedText.data),
      content: validatedText.data.substring(0, 5000),
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


export async function getAiAnalysisAction(analysisData: AnalysisData) {
  try {
    const dataForAI = {
      URL: analysisData.url.startsWith('manual-text') ? 'Manually Pasted Text' : analysisData.url,
      Author: analysisData.author || 'Not available',
      'Site Type': analysisData.siteType,
      'Has Citations': analysisData.hasCitations,
      'Ad Count': analysisData.adCount,
      'Content Snippet': analysisData.content.substring(0, 2000), // Pass a snippet
    };

    const result = await generateSummaryAndAnalysis({ analyzedData: JSON.stringify(dataForAI, null, 2) });

    if (!result.summary || !result.credibilityAnalysis) {
        throw new Error("AI analysis returned incomplete data.");
    }
    
    // Simulate AI generation time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
