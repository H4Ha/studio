'use server';

/**
 * @fileOverview A flow to suggest alternative URLs with potentially more credible information on the same topic.
 *
 * - suggestAlternativeURLs - A function that suggests alternative URLs.
 * - SuggestAlternativeURLsInput - The input type for the suggestAlternativeURLs function.
 * - SuggestAlternativeURLsOutput - The return type for the suggestAlternativeURLs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAlternativeURLsInputSchema = z.object({
  topic: z.string().describe('The topic to find alternative URLs for.'),
  currentUrl: z.string().describe('The URL the user is currently viewing.'),
});
export type SuggestAlternativeURLsInput = z.infer<typeof SuggestAlternativeURLsInputSchema>;

const SuggestAlternativeURLsOutputSchema = z.object({
  alternativeUrls: z.array(z.string().url()).describe('An array of plausible, representative, but not necessarily real, alternative URLs from credible sources.'),
});
export type SuggestAlternativeURLsOutput = z.infer<typeof SuggestAlternativeURLsOutputSchema>;

export async function suggestAlternativeURLs(input: SuggestAlternativeURLsInput): Promise<SuggestAlternativeURLsOutput> {
  return suggestAlternativeURLsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAlternativeURLsPrompt',
  input: {schema: SuggestAlternativeURLsInputSchema},
  output: {schema: SuggestAlternativeURLsOutputSchema},
  prompt: `You are an AI assistant that suggests alternative news sources on a given topic.

  The user is currently viewing this URL: {{{currentUrl}}}
  The topic is: "{{{topic}}}"

  Based on the topic, generate a list of 3 plausible, representative URLs from different, highly-credible news organizations (like Reuters, Associated Press, BBC News, The New York Times, etc.).

  IMPORTANT: The URLs you generate should be illustrative examples. They do not need to be real, working links, but they must follow a realistic URL structure for the source you choose. For example: https://www.credible-source.com/article/topic-name-goes-here-12345

  Return the list of 3 URLs in the 'alternativeUrls' array.
  `,
});

const suggestAlternativeURLsFlow = ai.defineFlow(
  {
    name: 'suggestAlternativeURLsFlow',
    inputSchema: SuggestAlternativeURLsInputSchema,
    outputSchema: SuggestAlternativeURLsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
