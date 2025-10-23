import type { AnalysisData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, BookOpen, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { format, isValid } from 'date-fns';

interface SourceInfoCardProps {
  data: AnalysisData;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-4 text-sm">
        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-grow">
            <span className="font-semibold">{label}:</span>
            <span className="ml-2 text-muted-foreground">{value}</span>
        </div>
    </div>
);

export function SourceInfoCard({ data }: SourceInfoCardProps) {
  const isPasted = data.url.startsWith('manual-text');
  const displayUrl = isPasted ? 'Pasted Text' : data.url;

  const pubDate = data.publicationDate ? new Date(data.publicationDate) : null;
  const formattedDate = pubDate && isValid(pubDate) ? format(pubDate, 'MMMM d, yyyy') : 'Not found';

  return (
    <Card className="shadow-lg bg-card/70 dark:bg-card/50 backdrop-blur-sm border border-border/20">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="font-headline text-lg sm:text-xl truncate" title={data.title}>
            {data.title}
        </CardTitle>
        {!isPasted && (
            <CardDescription className="flex items-center gap-2 pt-1">
                <LinkIcon className="h-4 w-4 flex-shrink-0" />
                <a 
                    href={data.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="truncate hover:underline text-xs sm:text-sm"
                >
                    {data.url}
                </a>
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        <InfoRow icon={User} label="Author" value={data.author || 'Not Found'} />
        <InfoRow icon={Calendar} label="Published" value={formattedDate} />
        <InfoRow 
            icon={BookOpen} 
            label="Site Type" 
            value={<Badge variant="secondary" className="capitalize">{data.siteType}</Badge>}
        />
      </CardContent>
    </Card>
  );
}
