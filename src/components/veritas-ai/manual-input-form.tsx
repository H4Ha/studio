'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/lib/types';
import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-primary hover:bg-primary/90 w-full"
      aria-disabled={pending}
    >
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="00 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Analyzing...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Analyze Pasted Text
        </>
      )}
    </Button>
  );
}

interface ManualInputFormProps {
  formAction: (payload: FormData) => void;
  status: FormState['status'];
  errorMessage?: string;
}

export function ManualInputForm({ formAction, status, errorMessage }: ManualInputFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (status === 'success') {
      formRef.current?.reset();
    }
  }, [status]);
  
  return (
    <Card className="shadow-lg bg-destructive/10 border-destructive/50">
        <CardHeader>
            <CardTitle className="font-headline text-xl text-destructive">Manual Analysis Required</CardTitle>
            <CardDescription className="text-destructive/90">
                {errorMessage || 'The URL is protected against automated scraping. Please copy the article text from your browser and paste it below to proceed with the analysis.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form ref={formRef} action={formAction} className="space-y-4">
                <Textarea
                    name="text"
                    placeholder="Paste the full text of the article here..."
                    required
                    className="min-h-[200px] text-base bg-background"
                    disabled={status === 'loading'}
                    aria-label="Article text to analyze"
                />
                <SubmitButton />
            </form>
        </CardContent>
    </Card>
  );
}
