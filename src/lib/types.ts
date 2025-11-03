import type { LucideIcon } from "lucide-react";

export type AnalysisData = {
  url: string;
  title: string;
  author: string | null;
  publicationDate: string | null; // ISO string or other date format
  siteType: 'News' | 'Encyclopedia' | 'Blog' | 'Forum' | 'Science' | 'Unknown';
  linkCount: number;
  externalLinkCount: number;
  internalLinkCount: number;
  adCount: number;
  advertisementDensity: number;
  hasCitations: boolean;
  correctionsPolicyFound: boolean;
  ownershipDisclosureFound: boolean;
  hasAuthorBioLink: boolean;
  authorIsGeneric: boolean;
  loadedLanguageCount: number;
  excessivePunctuationCount: number;
  headlineAllCapsRatio: number;
  readabilityScore: number;
  isOpinionOrEditorial: boolean;
  opinionLabelDetected: boolean;
  content: string; // for AI analysis
};

export type ScoreModifier = {
  dimension: string;
  criterion: string;
  factor: string;
  change: number;
  reason: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Variable';
  icon: keyof typeof import("lucide-react");
};

export type AnalysisResult = {
  score: number;
  modifiers: ScoreModifier[];
  data: AnalysisData;
};

export type AiAnalysisResult = {
  summary: string;
  credibilityAnalysis: string;
};

export type FormState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  result?: AnalysisResult;
};
