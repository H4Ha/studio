'use server';

/**
 * @fileOverview A flow to suggest alternative URLs with potentially more credible information on the same topic.
 *
 * - suggestAlternativeURLs - A function that suggests alternative URLs.
 * - SuggestAlternativeURLsInput - The input type for the suggestAlternativeURLs function.
 * - SuggestAlternativeURLsOutput - The return type for the suggestAlternativeURLs function.
 */

import {ai, googleAI} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAlternativeURLsInputSchema = z.object({
  topic: z.string().describe('The topic to find alternative URLs for.'),
  currentUrl: z.string().describe('The URL the user is currently viewing.'),
});
export type SuggestAlternativeURLsInput = z.infer<typeof SuggestAlternativeURLsInputSchema>;

const SuggestAlternativeURLsOutputSchema = z.object({
  alternativeUrls: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        source: z.string(),
      })
    )
    .describe('An array of alternative URLs from credible sources.'),
});
export type SuggestAlternativeURLsOutput = z.infer<typeof SuggestAlternativeURLsOutputSchema>;

export async function suggestAlternativeURLs(
  input: SuggestAlternativeURLsInput
): Promise<SuggestAlternativeURLsOutput> {
  return suggestAlternativeURLsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAlternativeURLsPrompt',
  input: {schema: SuggestAlternativeURLsInputSchema},
  output: {schema: SuggestAlternativeURLsOutputSchema},
  tools: [googleAI.googleSearch],
  prompt: `You are an expert AI research assistant. The user wants to find alternative, credible sources for a given topic.

  The user's current topic is: "{{{topic}}}"
  The user is currently viewing this URL: {{{currentUrl}}}

  Your task is to use the googleSearch tool to find 3 real, currently accessible articles on the same topic from different, highly-credible news organizations or academic sources (e.g., Reuters, Associated Press, BBC News, The New York Times, Nature, Science, etc.).

  Do not suggest the same domain as the user's current URL.

  For each article you find, provide its title, the full URL, and the name of the source.
  Return these 3 articles in the 'alternativeUrls' array.
  `,
});

const suggestAlternativeURLsFlow = ai.defineFlow(
  {
    name: 'suggestAlternativeURLsFlow',
    inputSchema: SuggestAlternativeURLsInputSchema,
    outputSchema: SuggestAlternativeURLsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, {model: googleAI.model('gemini-2.5-pro')});
    if (!output) {
      throw new Error('AI model did not return a valid output.');
    }
    return output;
  }
);
