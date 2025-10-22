'use client';

import { useActionState, useEffect } from 'react';
import { analyzeUrlAction } from '@/app/actions';
import { Header } from '@/components/veritas-ai/header';
import { UrlForm } from '@/components/veritas-ai/url-form';
import { ResultsDisplay } from '@/components/veritas-ai/results-display';
import type { FormState } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const initialState: FormState = {
  status: 'idle',
};

export default function Home() {
  const [state, formAction] = useActionState(analyzeUrlAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === 'error' && state.message) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="max-w-3xl mx-auto">
          <UrlForm formAction={formAction} status={state.status} />

          <div className="mt-12">
            {state.status === 'loading' && <LoadingIndicator />}
            {state.status === 'success' && state.result && (
              <div className="animate-in fade-in-0 slide-in-from-top-4 duration-500">
                <ResultsDisplay result={state.result} />
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
      <span className="font-semibold text-lg font-headline">Analyzing URL...</span>
    </div>
    <p className="mt-2 text-sm">Please wait while we scrutinize the digital page.</p>
  </div>
);
