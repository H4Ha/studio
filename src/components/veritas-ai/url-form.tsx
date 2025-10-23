'use client';

import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { FormState } from '@/lib/types';
import { useEffect, useRef } from 'react';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="bg-primary hover:bg-primary/90 w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow"
      aria-disabled={pending}
    >
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Analyzing...
        </>
      ) : (
        <>
          <Search className="mr-2 h-4 w-4" />
          Analyze URL
        </>
      )}
    </Button>
  );
}

interface UrlFormProps {
  formAction: (payload: FormData) => void;
  status: FormState['status'];
}

export function UrlForm({ formAction, status }: UrlFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (status === 'success') {
      formRef.current?.reset();
    }
  }, [status]);
  
  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 relative">
        <Input
          name="url"
          type="url"
          placeholder="https://example.com/article"
          required
          className="flex-grow text-base h-12 shadow-inner bg-card/50 pl-10"
          disabled={status === 'loading'}
          aria-label="URL to analyze"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <SubmitButton />
      </div>
    </form>
  );
}
