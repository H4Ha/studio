'use server';

import { generateSummaryAndAnalysis } from '@/ai/flows/generate-summary-and-analysis';
import { suggestAlternativeURLs } from '@/ai/flows/suggest-alternative-urls';
import { calculateScore } from '@/lib/scoring';
import type { AnalysisData, FormState } from '@/lib/types';
import * as cheerio from 'cheerio';

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

    // Improved content extraction
    // Try to find the main content in common article containers
    let mainContent = '';
    
    $('script, style, nav, header, footer, aside, form, [role="navigation"], [role="search"], .ad, .advert, noscript').remove();
    
    mainContent = $('article').text() || $('[role="main"]').text() || $('main').text();
    
    if (!mainContent || mainContent.length < 200) {
      // A more generic attempt if specific tags fail
      mainContent = $('#content, #main, .post-content, .article-body, .story-content').text();
    }
    
    // If specific containers aren't found, fall back to the cleaned body
    if (!mainContent || mainContent.length < 200) {
      mainContent = $('body').text();
    }
    
    const content = mainContent.replace(/\s+/g, ' ').trim();

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


     const manualData: AnalysisData = {
      url: `manual-text-${Date.now()}`,
      author: author,
      publicationDate: new Date().toISOString(),
      siteType: siteType,
      linkCount: (text.match(/http/g) || []).length,
      externalLinkCount: (text.match(/http/g) || []).length,
      adCount: 0,
      hasCitations: /references|sources|citations/i.test(text),
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
      Author: analysisData.author || 'Not available',
      'Site Type': analysisData.siteType,
      'Has Citations': analysisData.hasCitations,
      'Ad Count': analysisData.adCount,
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
