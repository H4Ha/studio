import {genkit} from 'genkit';
import {googleAI as googleAIPlugin} from '@genkit-ai/google-genai';

export const googleAI = googleAIPlugin();

export const ai = genkit({
  plugins: [googleAI],
  model: 'googleai/gemini-2.5-flash',
});
