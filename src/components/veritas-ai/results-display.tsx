import type { AnalysisResult } from '@/lib/types';
import { ScoreDisplay } from './score-display';
import { AnalysisCard } from './analysis-card';
import { AiAnalysis } from './ai-analysis';

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  return (
    <div className="space-y-8">
      <ScoreDisplay score={result.score} />
      <AnalysisCard modifiers={result.modifiers} />
      <AiAnalysis analysisData={result.data} />
    </div>
  );
}
