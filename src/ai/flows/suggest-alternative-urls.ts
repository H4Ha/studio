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
  alternativeUrls: z.array(z.string()).describe('An array of alternative URLs.'),
});
export type SuggestAlternativeURLsOutput = z.infer<typeof SuggestAlternativeURLsOutputSchema>;

export async function suggestAlternativeURLs(input: SuggestAlternativeURLsInput): Promise<SuggestAlternativeURLsOutput> {
  return suggestAlternativeURLsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAlternativeURLsPrompt',
  input: {schema: SuggestAlternativeURLsInputSchema},
  output: {schema: SuggestAlternativeURLsOutputSchema},
  prompt: `You are an AI assistant that suggests alternative URLs with potentially more credible information on the same topic.

  The user is currently viewing this URL: {{{currentUrl}}}

  Suggest 3 alternative URLs for the topic: {{{topic}}}. Return only the URLs in an array.
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
