const LOADED_LANGUAGE_WORDS = [
  'shocking',
  'outrageous',
  'disaster',
  'catastrophic',
  'devastating',
  'unbelievable',
  'unprecedented',
  'scandal',
  'corrupt',
  'corruption',
  'miracle',
  'nightmare',
  'terrifying',
  'horrifying',
  'furious',
  'furor',
  'slam',
  'slams',
  'blast',
  'blasts',
  'panic',
  'chaos',
  'explosive',
  'outrage',
  'absolutely',
  'disgrace',
  'disgraceful',
  'sweeping',
  'game-changing',
  'massive',
  'alarming',
  'crisis',
];

const VOWEL_REGEX = /[aeiouy]/i;

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function countSyllables(word: string): number {
  const sanitized = stripDiacritics(word.toLowerCase()).replace(/[^a-z]/g, '');
  if (!sanitized) return 0;

  if (sanitized.length <= 3) {
    return 1;
  }

  let syllables = 0;
  let previousWasVowel = false;

  for (const char of sanitized) {
    const isVowel = VOWEL_REGEX.test(char);
    if (isVowel && !previousWasVowel) {
      syllables += 1;
    }
    previousWasVowel = isVowel;
  }

  if (sanitized.endsWith('e')) {
    syllables -= 1;
  }

  if (sanitized.endsWith('le') && sanitized.length > 2 && !VOWEL_REGEX.test(sanitized[sanitized.length - 3])) {
    syllables += 1;
  }

  return Math.max(syllables, 1);
}

export function calculateFleschReadingEase(text: string): number {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\.\?!\s]/g, '')
    .trim();

  if (!cleaned) {
    return 100;
  }

  const sentences = cleaned.split(/[\.\?!]+/).filter(Boolean);
  const words = cleaned.split(/\s+/).filter(Boolean);

  const sentenceCount = Math.max(sentences.length, 1);
  const wordCount = Math.max(words.length, 1);

  const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0);

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = syllableCount / wordCount;

  const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

function escapeRegexTerm(term: string): string {
  return term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

export function countLoadedLanguage(text: string): number {
  const lowered = text.toLowerCase();
  return LOADED_LANGUAGE_WORDS.reduce((total, word) => {
    const pattern = new RegExp(`\\b${escapeRegexTerm(word)}\\b`, 'g');
    const matches = lowered.match(pattern);
    return total + (matches ? matches.length : 0);
  }, 0);
}

export function countExcessivePunctuation(text: string): number {
  const doubleExclamations = (text.match(/!!+/g) || []).length;
  const doubleQuestions = (text.match(/\?\?+/g) || []).length;
  return doubleExclamations + doubleQuestions;
}

export function computeAllCapsRatio(text: string): number {
  const lettersOnly = text.replace(/[^a-zA-Z]/g, '');
  if (!lettersOnly) {
    return 0;
  }
  const uppercaseLetters = lettersOnly.replace(/[^A-Z]/g, '');
  return uppercaseLetters.length / lettersOnly.length;
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractLargestTextBlock(blocks: string[]): string {
  return blocks
    .map(block => normalizeWhitespace(block))
    .filter(block => block.length > 0)
    .sort((a, b) => b.length - a.length)[0] || '';
}
