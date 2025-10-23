'use client';

import { useActionState, useEffect, useState } from 'react';
import { analyzeUrlAction, analyzeTextAction } from '@/app/actions';
import { Header } from '@/components/veritas-ai/header';
import { UrlForm } from '@/components/veritas-ai/url-form';
import { ManualInputForm } from '@/components/veritas-ai/manual-input-form';
import { ResultsDisplay } from '@/components/veritas-ai/results-display';
import type { FormState } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const initialState: FormState = {
  status: 'idle',
};

export default function Home() {
  const [state, formAction, isUrlPending] = useActionState(analyzeUrlAction, initialState);
  const [manualState, manualFormAction, isManualPending] = useActionState(analyzeTextAction, initialState);
  
  const { toast } = useToast();
  const [showLoading, setShowLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  const isPending = isUrlPending || isManualPending;
  const finalState = manualState.status !== 'idle' ? manualState : state;

  useEffect(() => {
    if (isPending) {
      setShowLoading(true);
      setShowManualInput(false); // Hide manual input during analysis
    } else {
      setShowLoading(false);
    }
  }, [isPending]);

  useEffect(() => {
    if (state.status === 'error' && state.message) {
      if (state.message.includes('blocking automated analysis')) {
         setShowManualInput(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Analysis Error',
          description: state.message,
        });
      }
    }
    if (state.status === 'success') {
      setShowManualInput(false);
    }
  }, [state, toast]);
  
  useEffect(() => {
    if (manualState.status === 'error' && manualState.message) {
        toast({
          variant: 'destructive',
          title: 'Analysis Error',
          description: manualState.message,
        });
    }
    if (manualState.status === 'success') {
      setShowManualInput(false);
    }
  }, [manualState, toast]);

  const handleBack = () => {
    setShowManualInput(false);
    // Reset state if needed
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="max-w-3xl mx-auto">
          {showManualInput ? (
             <div className="animate-in fade-in-0 duration-500">
                <Button variant="ghost" onClick={handleBack} className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to URL Input
                </Button>
                <ManualInputForm formAction={manualFormAction} status={isManualPending ? 'loading' : manualState.status} errorMessage={state.message} />
            </div>
          ) : (
            <UrlForm formAction={formAction} status={isUrlPending ? 'loading' : state.status} />
          )}

          <div className="mt-12">
            {showLoading && <LoadingIndicator />}
            {finalState.status === 'success' && finalState.result && !isPending && (
              <div key={finalState.result.data.url || 'manual-result'} className="animate-in fade-in-0 slide-in-from-top-4 duration-500">
                <ResultsDisplay result={finalState.result} />
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} VeritasAI. All rights reserved.</p>
      </footer>
    </div>
  );
}

const LoadingIndicator = () => (
  <div className="text-center animate-in fade-in-0 duration-300">
    <div className="flex justify-center items-center gap-3 text-muted-foreground">
      <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="font-semibold text-lg font-headline">Analyzing...</span>
    </div>
    <p className="mt-2 text-sm">Fetching and scrutinizing the content. This may take a moment.</p>
  </div>
);
