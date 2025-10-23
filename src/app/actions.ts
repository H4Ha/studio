'use server';

import { generateSummaryAndAnalysis } from '@/ai/flows/generate-summary-and-analysis';
import { calculateScore } from '@/lib/scoring';
import type { AnalysisData, FormState } from '@/lib/types';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const urlSchema = z.string().url({ message: 'Please enter a valid URL, including https://' });

async function scrapeUrl(url: string): Promise<AnalysisData> {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
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
      const jsonLd = $('script[type="application/ld+json"]').html();
      if (jsonLd) {
        const data = JSON.parse(jsonLd);
        if (data.author && data.author.name) {
          author = data.author.name;
        } else if (data.publisher && data.publisher.name) {
          author = data.publisher.name; // Fallback to publisher
        }
      }
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

  // If specific containers aren't found, fall back to the body but clean it up
  if (!mainContent || mainContent.length < 200) {
    $('script, style, nav, header, footer, aside, form, [role="navigation"], [role="search"]').remove();
    mainContent = $('body').text();
  }
  
  const content = mainContent.replace(/\s+/g, ' ').trim();


  const urlObject = new URL(url);
  const domain = urlObject.hostname;

  // Heuristics for site type
  let siteType: AnalysisData['siteType'] = 'Unknown';
  if (domain.includes('wikipedia.org')) siteType = 'Encyclopedia';
  else if (domain.match(/news|bbc|cnn|reuters|apnews/)) siteType = 'News';
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
    return {
      status: 'error',
      message: `Failed to analyze the URL: ${message}`,
    };
  }
}

export async function getAiAnalysisAction(analysisData: AnalysisData) {
  try {
    const dataForAI = {
      URL: analysisData.url,
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
