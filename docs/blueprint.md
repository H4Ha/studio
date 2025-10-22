# **App Name**: VeritasAI

## Core Features:

- Frontend (VeritasAI UI): A user submits a URL.
- Backend (Cloud Function): An HTTP function (`analyzeUrl`) is called.
- Scraping: The Python function fetches the URL's content using `requests` and `BeautifulSoup`.
- Automated Analysis: The function scans the text and HTML to *automatically* determine values for your framework (e.g., it counts links, finds the author, checks for dates, etc.).
- Scoring: It then runs your *exact* if/then scoring logic (ported to Python) on these automated values.
- Response: The function returns the final score, modifiers, and the data it found to the frontend.
- Frontend (Display): The "VeritasAI" UI updates with the score and results.
- AI Analysis (Optional): The user can then click "Generate Analysis," which calls a *second*, secure Cloud Function (`getGeminiAnalysis`) to get the Gemini report.

## Style Guidelines:

- Primary color: Deep teal (#008080) to evoke trust and reliability.
- Background color: Light gray (#F0F0F0) for a clean, modern look.
- Accent color: Soft orange (#FFA07A) for highlights and interactive elements.
- Headline font: 'Space Grotesk', sans-serif. Body font: 'Inter', sans-serif.
- Use a set of minimalist icons for each scoring factor (accuracy, objectivity, etc.).
- Maintain a clean and structured layout that allows a very seamless usage and focus on content credibility scoring.
- Subtle animations for score updates and the generation of analysis reports. Use minimalist design.