'use server';

import { z } from 'zod';
import { generateSummaryAndAnalysis } from '@/ai/flows/generate-summary-and-analysis';
import { calculateScore, getMockAnalysisData } from '@/lib/scoring';
import type { AnalysisData, FormState } from '@/lib/types';

const urlSchema = z.string().url({ message: 'Please enter a valid URL, including https://' });

export async function analyzeUrlAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const rawUrl = formData.get('url');

  const validatedUrl = urlSchema.safeParse(rawUrl);

  if (!validatedUrl.success) {
    return {
      status: 'error',
      message: validatedUrl.error.errors[0].message,
    };
  }

  // To update the loading state on the client
  // we need to return a pending state. However, useFormState doesn't re-render for this.
  // The client will handle the loading state optimistically.

  // Simulate network delay for analysis
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // In a real app, this would involve scraping and analysis
    const mockData = getMockAnalysisData(validatedUrl.data);
    const analysisResult = calculateScore(mockData);

    return {
      status: 'success',
      message: 'Analysis complete.',
      result: analysisResult,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to analyze the URL. Please try again.',
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

    const result = await generateSummaryAndAnalysis({ analyzedData: dataForAI });

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
