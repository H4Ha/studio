import type { ScoreModifier } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import React from 'react';
import { Check, Info } from 'lucide-react';

interface AnalysisCardProps {
  modifiers: ScoreModifier[];
}

const fallbackIcon = 'HelpCircle';

export function AnalysisCard({ modifiers }: AnalysisCardProps) {
  return (
    <Card className="shadow-lg bg-card/70 dark:bg-card/50 backdrop-blur-sm border border-border/20">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-3">
          <Info className="text-primary" />
          Analysis Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <ul className="space-y-3">
          {modifiers.map((modifier, index) => {
            const isPositive = modifier.change > 0;
            const IconComponent = LucideIcons[modifier.icon] || LucideIcons[fallbackIcon];

            return (
              <li key={index} className="flex items-start gap-4 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors">
                <div className={cn(
                  "rounded-full p-2 flex-shrink-0 mt-1",
                  isPositive ? 'bg-primary/10' : 'bg-destructive/10'
                )}>
                  {IconComponent && <IconComponent className={cn(
                    "h-5 w-5",
                    isPositive ? 'text-primary' : 'text-destructive'
                  )} aria-hidden="true" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm sm:text-base">{modifier.factor}</h3>
                    <span className={cn(
                      "font-bold text-sm",
                      isPositive ? 'text-primary' : 'text-destructive'
                    )}>
                      ({modifier.change > 0 ? '+' : ''}{modifier.change})
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm">{modifier.reason}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
