'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { analyzeUrlAction, analyzeTextAction } from '@/app/actions';
import { Header } from '@/components/veritas-ai/header';
import { UrlForm } from '@/components/veritas-ai/url-form';
import { ManualInputForm } from '@/components/veritas-ai/manual-input-form';
import { ResultsDisplay } from '@/components/veritas-ai/results-display';
import type { FormState } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/veritas-ai/theme-switcher';
import type { Theme } from '@/components/veritas-ai/theme-switcher';

const initialState: FormState = {
  status: 'idle',
};

export default function Home() {
  const [state, formAction, isUrlPending] = useActionState(analyzeUrlAction, initialState);
  const [manualState, manualFormAction, isManualPending] = useActionState(analyzeTextAction, initialState);
  const [view, setView] = useState<'form' | 'results' | 'manual'>('form');
  const [resultKey, setResultKey] = useState(0);

  const { toast } = useToast();

  const isPending = isUrlPending || isManualPending;
  const finalState = view === 'manual' ? manualState : state;

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = storedTheme || 'system';

    const applyTheme = (theme: Theme) => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', systemPrefersDark);
      } else {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    };
    
    applyTheme(initialTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentTheme = localStorage.getItem('theme') as Theme | null;
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isPending) {
        setView('results');
    }
  }, [isPending]);
  
  useEffect(() => {
    if (finalState.status === 'error' && finalState.message) {
      if (finalState.message.includes('blocking automated analysis')) {
         setView('manual');
      } else {
        toast({
          variant: 'destructive',
          title: 'Analysis Error',
          description: finalState.message,
        });
        setView('form'); // Go back to form on other errors
      }
    }
    if (finalState.status === 'success') {
      setView('results');
      setResultKey(prev => prev + 1); // Force re-mount of results
    }
  }, [finalState, toast]);

  const handleReset = () => {
    setView('form');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-slate-900/[0.04] dark:bg-grid-slate-100/[0.03] [mask-image:linear-gradient(to_bottom,white_5%,transparent_100%)]"></div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <section className="max-w-3xl mx-auto">
            {view === 'form' && (
              <div className="animate-in fade-in-0 duration-500">
                  <UrlForm formAction={formAction} status={isUrlPending ? 'loading' : state.status} />
              </div>
            )}

            {view === 'manual' && (
              <div className="animate-in fade-in-0 duration-500">
                  <Button variant="ghost" onClick={() => setView('form')} className="mb-4 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to URL Input
                  </Button>
                  <ManualInputForm formAction={manualFormAction} status={isManualPending ? 'loading' : manualState.status} errorMessage={state.message} />
              </div>
            )}

            {view === 'results' && (
              <div className="space-y-6">
                  <Button onClick={handleReset} variant="outline" className="flex items-center gap-2 transition-all hover:bg-accent/10 hover:ring-2 hover:ring-primary">
                      <RefreshCw className="h-4 w-4" />
                      Analyze Another
                  </Button>
                  {isPending && <LoadingIndicator />}
                  {finalState.status === 'success' && finalState.result && !isPending && (
                    <div key={resultKey} className="animate-in fade-in-0 slide-in-from-top-4 duration-500">
                      <ResultsDisplay result={finalState.result} />
                    </div>
                  )}
              </div>
            )}
          </section>
        </main>
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} VeritasAI. All rights reserved.</p>
        </footer>
      </div>
      <ThemeSwitcher />
    </div>
  );
}

const LoadingIndicator = () => (
  <div className="text-center animate-in fade-in-0 duration-300 p-8 border-2 border-dashed rounded-lg bg-card/50 dark:bg-card/80">
    <div className="flex justify-center items-center gap-3 text-primary">
      <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="font-semibold text-lg font-headline">Analyzing...</span>
    </div>
    <p className="mt-2 text-sm text-muted-foreground">Fetching and scrutinizing the content. This may take a moment.</p>
  </div>
);
