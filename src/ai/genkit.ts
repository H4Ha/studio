import {genkit} from 'genkit';
import {googleAI as createGoogleAIPlugin} from '@genkit-ai/google-genai';

const googleAIPlugin = createGoogleAIPlugin();

export const ai = genkit({
  plugins: [googleAIPlugin],
  model: 'googleai/gemini-2.5-flash',
});

export const googleAI = createGoogleAIPlugin;
