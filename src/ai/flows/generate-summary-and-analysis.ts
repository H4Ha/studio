'use server';

/**
 * @fileOverview Generates a summary and analysis of a webpage's content and credibility using AI.
 *
 * - generateSummaryAndAnalysis - A function that generates the summary and analysis.
 * - GenerateSummaryAndAnalysisInput - The input type for the generateSummaryAndAnalysis function.
 * - GenerateSummaryAndAnalysisOutput - The return type for the generateSummaryAndAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSummaryAndAnalysisInputSchema = z.object({
  analyzedData: z.string().describe('A JSON string containing the analyzed data from the webpage.'),
});
export type GenerateSummaryAndAnalysisInput = z.infer<typeof GenerateSummaryAndAnalysisInputSchema>;

const GenerateSummaryAndAnalysisOutputSchema = z.object({
  summary: z.string().describe('A summary of the webpage content.'),
  credibilityAnalysis: z.string().describe('An analysis of the webpage credibility based on the analyzed data.'),
});
export type GenerateSummaryAndAnalysisOutput = z.infer<typeof GenerateSummaryAndAnalysisOutputSchema>;

export async function generateSummaryAndAnalysis(
  input: GenerateSummaryAndAnalysisInput
): Promise<GenerateSummaryAndAnalysisOutput> {
  return generateSummaryAndAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSummaryAndAnalysisPrompt',
  input: {schema: GenerateSummaryAndAnalysisInputSchema},
  output: {schema: GenerateSummaryAndAnalysisOutputSchema},
  prompt: `You are an AI assistant that analyzes webpage content and credibility.

  Based on the analyzed data provided in the JSON string below, generate a concise summary of the webpage's content and provide an analysis of its credibility. Consider factors such as the author's expertise, the presence of supporting evidence, potential biases, and the overall objectivity of the information presented.

  Do not mention that you were provided with a JSON object. Refer to it as "the analysis results" or "the provided data".

  Analyzed Data:
  {{{analyzedData}}}`,
});

const generateSummaryAndAnalysisFlow = ai.defineFlow(
  {
    name: 'generateSummaryAndAnalysisFlow',
    inputSchema: GenerateSummaryAndAnalysisInputSchema,
    outputSchema: GenerateSummaryAndAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI model did not return a valid output.');
    }
    return output;
  }
);
