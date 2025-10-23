'use client';

import { useState } from 'react';
import { suggestAlternativesAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, BookOpenCheck, ExternalLink } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface AlternativeSourcesProps {
  topic: string;
  currentUrl: string;
}

type SuggestedUrl = {
  title: string;
  url: string;
  source: string;
}

export function AlternativeSources({ topic, currentUrl }: AlternativeSourcesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [urls, setUrls] = useState<SuggestedUrl[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setUrls([]);

    const response = await suggestAlternativesAction(topic, currentUrl);

    if (response.status === 'success') {
      setUrls(response.urls);
    } else {
      setError(response.message);
    }
    setIsLoading(false);
  };

  return (
    <Card className="shadow-lg bg-card/70 dark:bg-card/50 backdrop-blur-sm border border-border/20">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-3">
          <BookOpenCheck className="text-primary" />
          Find Alternative Sources
        </CardTitle>
        <CardDescription>
          Explore other perspectives. AI will search for real articles on the same topic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {urls.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border/50 rounded-lg bg-background/50">
            <Globe className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="mb-4 text-muted-foreground">Diversify your reading and get a more complete picture.</p>
            <Button onClick={handleGenerate} variant="secondary" className="shadow-md hover:shadow-lg transition-shadow">
              Suggest Alternatives
            </Button>
          </div>
        )}

        {isLoading && <LoadingSkeleton />}
        
        {error && (
            <div className="text-destructive text-center p-4 bg-destructive/10 rounded-md">
                <p className="font-bold">Could Not Suggest Sources</p>
                <p className="text-sm">{error}</p>
            </div>
        )}

        {urls.length > 0 && (
          <div className="space-y-3 animate-in fade-in-50 duration-500">
             <Alert>
              <AlertTitle className="font-semibold">Suggested For You</AlertTitle>
              <AlertDescription>
                Here are a few alternative sources on the same topic for a broader perspective.
              </AlertDescription>
            </Alert>
            <ul className="space-y-2">
              {urls.map((item, index) => (
                <li key={index}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-md bg-background/50 hover:bg-accent/20 transition-colors group">
                    <div className='flex items-center justify-between gap-4'>
                      <div>
                        <p className="font-semibold text-primary group-hover:underline">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.source}</p>
                      </div>
                      <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LoadingSkeleton = () => (
    <div className="space-y-3 p-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
    </div>
);
