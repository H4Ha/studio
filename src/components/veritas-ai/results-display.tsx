import type { AnalysisResult } from '@/lib/types';
import { ScoreDisplay } from './score-display';
import { AnalysisCard } from './analysis-card';
import { AiAnalysis } from './ai-analysis';
import { SourceInfoCard } from './source-info-card';
import { AlternativeSources } from './alternative-sources';

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        <ScoreDisplay score={result.score} />
        <SourceInfoCard data={result.data} />
      </div>
      <AnalysisCard modifiers={result.modifiers} />
      <AiAnalysis analysisData={result.data} />
      <AlternativeSources topic={result.data.title} currentUrl={result.data.url} />
    </div>
  );
}
