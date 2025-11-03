import type { AnalysisData, ScoreModifier, AnalysisResult } from "@/lib/types";
import { isValid } from 'date-fns';

type Severity = ScoreModifier['severity'];

function applyModifier(
  modifiers: ScoreModifier[],
  dimension: string,
  criterion: string,
  factor: string,
  change: number,
  reason: string,
  severity: Severity,
  icon: ScoreModifier['icon']
): number {
  const normalizedChange = Number(change.toFixed(2));
  modifiers.push({ dimension, criterion, factor, change: normalizedChange, reason, severity, icon });
  return normalizedChange;
}

export function calculateScore(data: AnalysisData): AnalysisResult {
  let score = 100;
  const modifiers: ScoreModifier[] = [];

  // Dimension 1: Transparency & Accountability
  const correctionsChange = data.correctionsPolicyFound ? 10 : -10;
  score += applyModifier(
    modifiers,
    'Transparency & Accountability',
    '1.1 Explicit Corrections Policy',
    '1.1 Corrections Policy',
    correctionsChange,
    data.correctionsPolicyFound
      ? 'Corrections or errata policy is discoverable, signaling accountability.'
      : 'No visible corrections policy; accountability channel is missing.',
    'Critical',
    data.correctionsPolicyFound ? 'ShieldCheck' : 'ShieldAlert'
  );

  const ownershipChange = data.ownershipDisclosureFound ? 5 : -5;
  score += applyModifier(
    modifiers,
    'Transparency & Accountability',
    '1.2 Identifiable Ownership/Funding',
    '1.2 Ownership & Funding',
    ownershipChange,
    data.ownershipDisclosureFound
      ? 'Ownership or funding disclosure is available for readers.'
      : 'No ownership/funding disclosure detected, limiting transparency.',
    'Major',
    data.ownershipDisclosureFound ? 'Landmark' : 'Building'
  );

  // Dimension 2: Authority & Sourcing
  if (data.author && !data.authorIsGeneric) {
    score += applyModifier(
      modifiers,
      'Authority & Sourcing',
      '2.1 Identifiable Authorship',
      '2.1 Authorship',
      10,
      `Author "${data.author}" is identified, supporting accountability.`,
      'Critical',
      'User'
    );
  } else {
    score += applyModifier(
      modifiers,
      'Authority & Sourcing',
      '2.1 Identifiable Authorship',
      '2.1 Authorship',
      -15,
      'Authorship is missing or generic, weakening accountability.',
      'Critical',
      'UserCircle'
    );
  }

  if (data.hasAuthorBioLink) {
    score += applyModifier(
      modifiers,
      'Authority & Sourcing',
      '2.2 Author Biography Link',
      '2.2 Author Bio',
      5,
      'An author biography link enables credential verification.',
      'Minor',
      'BookUser'
    );
  }

  // Dimension 3: Accuracy & Verifiability
  if (data.externalLinkCount === 0) {
    score += applyModifier(
      modifiers,
      'Accuracy & Verifiability',
      '3.1 Citing External Sources',
      '3.1 External Sources',
      -10,
      'No external sources are cited, reducing verifiability.',
      'Major',
      'Link'
    );
  } else {
    const externalBonus = Math.min(data.externalLinkCount * 1.5, 15);
    score += applyModifier(
      modifiers,
      'Accuracy & Verifiability',
      '3.1 Citing External Sources',
      '3.1 External Sources',
      externalBonus,
      `${data.externalLinkCount} external source link(s) support verification.`,
      'Major',
      'Link'
    );
  }

  if (data.internalLinkCount > 0) {
    const internalBonus = Math.min(data.internalLinkCount * 0.5, 5);
    score += applyModifier(
      modifiers,
      'Accuracy & Verifiability',
      '3.2 Citing Internal Sources',
      '3.2 Internal Sources',
      internalBonus,
      `${data.internalLinkCount} internal link(s) indicate contextual depth.`,
      'Minor',
      'Link2'
    );
  }

  if (data.isOpinionOrEditorial) {
    if (data.opinionLabelDetected) {
      score += applyModifier(
        modifiers,
        'Accuracy & Verifiability',
        '3.3 Professional Standards',
        '3.3 Fact/Opinion Distinction',
        0,
        'Opinion content is clearly labeled, maintaining transparency.',
        'Variable',
        'Scale'
      );
    } else {
      score += applyModifier(
        modifiers,
        'Accuracy & Verifiability',
        '3.3 Professional Standards',
        '3.3 Fact/Opinion Distinction',
        -8,
        'Opinion indicators found without explicit labeling, blurring fact-opinion boundaries.',
        'Variable',
        'Scale'
      );
    }
  }

  // Dimension 4: Objectivity & Tone
  if (data.loadedLanguageCount > 0) {
    const penalty = Math.min(data.loadedLanguageCount * 1.5, 20);
    score += applyModifier(
      modifiers,
      'Objectivity & Tone',
      '4.1 Use of Loaded Language',
      '4.1 Loaded Language',
      -penalty,
      `${data.loadedLanguageCount} loaded term(s) detected, indicating persuasive tone.`,
      'Major',
      'AlertTriangle'
    );
  }

  if (data.excessivePunctuationCount > 0) {
    const punctuationPenalty = data.excessivePunctuationCount * 3;
    score += applyModifier(
      modifiers,
      'Objectivity & Tone',
      '4.2 Excessive Punctuation',
      '4.2 Punctuation',
      -punctuationPenalty,
      'Headline or subheadings include excessive punctuation suggestive of sensationalism.',
      'Minor',
      'Type'
    );
  }

  if (data.headlineAllCapsRatio > 0.3) {
    score += applyModifier(
      modifiers,
      'Objectivity & Tone',
      '4.3 All Caps Headline Usage',
      '4.3 All Caps Headline',
      -5,
      'Headline relies heavily on all caps, signaling sensational framing.',
      'Minor',
      'CaseSensitive'
    );
  }

  // Dimension 5: Presentation & Currency
  if (data.publicationDate) {
    const parsedDate = new Date(data.publicationDate);
    if (isValid(parsedDate)) {
      score += applyModifier(
        modifiers,
        'Presentation & Currency',
        '5.1 Publication Date',
        '5.1 Publication Date',
        5,
        'A parsable publication date confirms recency information.',
        'Major',
        'Calendar'
      );
    } else {
      score += applyModifier(
        modifiers,
        'Presentation & Currency',
        '5.1 Publication Date',
        '5.1 Publication Date',
        -10,
        'Publication date present but unparseable, undermining currency.',
        'Major',
        'CalendarX'
      );
    }
  } else {
    score += applyModifier(
      modifiers,
      'Presentation & Currency',
      '5.1 Publication Date',
      '5.1 Publication Date',
      -10,
      'No publication date found, hindering evaluation of timeliness.',
      'Major',
      'CalendarX'
    );
  }

  if (data.advertisementDensity > 0.4) {
    score += applyModifier(
      modifiers,
      'Presentation & Currency',
      '5.2 Advertisement Density',
      '5.2 Ad Density',
      -5,
      `High advertisement density (${Math.round(data.advertisementDensity * 100)}%) suggests commercial prioritization.`,
      'Minor',
      'BadgeDollarSign'
    );
  }

  if (data.readabilityScore < 30) {
    score += applyModifier(
      modifiers,
      'Presentation & Currency',
      '5.3 Readability Score',
      '5.3 Readability',
      -5,
      `Flesch Reading Ease score of ${data.readabilityScore} indicates very difficult text.`,
      'Minor',
      'BookOpen'
    );
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    modifiers,
    data,
  };
}
