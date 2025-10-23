'use client';

import { useState } from 'react';
import { getAiAnalysisAction } from '@/app/actions';
import type { AiAnalysisResult, AnalysisData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wand2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface AiAnalysisProps {
  analysisData: AnalysisData;
}

export function AiAnalysis({ analysisData }: AiAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const analysisDataString = JSON.stringify(analysisData);
    const response = await getAiAnalysisAction(analysisDataString);

    if (response.status === 'success') {
      setResult(response.analysis);
    } else {
      setError(response.message);
    }
    setIsLoading(false);
  };

  return (
    <Card className="shadow-lg bg-card/70 dark:bg-card/50 backdrop-blur-sm border border-border/20">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-3">
          <Wand2 className="text-primary" />
          Generative AI Report
        </CardTitle>
        <CardDescription>
          Get a deeper, AI-powered analysis of the content's summary and potential biases.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!result && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border/50 rounded-lg bg-background/50">
            <Wand2 className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="mb-4 text-muted-foreground">Click below to generate a detailed report using AI.</p>
            <Button onClick={handleGenerate} className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-shadow">
              <Wand2 className="mr-2 h-4 w-4" />
              Generate AI Report
            </Button>
          </div>
        )}

        {isLoading && <LoadingSkeleton />}
        
        {error && (
            <div className="text-destructive text-center p-4 bg-destructive/10 rounded-md">
                <p className="font-bold">Analysis Failed</p>
                <p className="text-sm">{error}</p>
            </div>
        )}

        {result && (
          <div className="animate-in fade-in-50 duration-500">
            <Accordion type="single" collapsible defaultValue="summary" className="w-full">
              <AccordionItem value="summary">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Summary</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-foreground/90 pt-2">
                  {result.summary}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="credibility" className="border-b-0">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Credibility Analysis</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-foreground/90 pt-2">
                  {result.credibilityAnalysis}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LoadingSkeleton = () => (
    <div className="space-y-6 p-2">
        <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>
         <div className="space-y-2 pt-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
    </div>
);
