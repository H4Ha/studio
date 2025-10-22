import type { LucideIcon } from "lucide-react";

export type AnalysisData = {
  url: string;
  author: string | null;
  publicationDate: string | null; // ISO string
  siteType: 'News' | 'Encyclopedia' | 'Blog' | 'Forum' | 'Science' | 'Unknown';
  linkCount: number;
  externalLinkCount: number;
  adCount: number;
  hasCitations: boolean;
  domainAgeDays: number;
  content: string; // for AI analysis
};

export type ScoreModifier = {
  factor: string;
  change: number;
  reason: string;
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
