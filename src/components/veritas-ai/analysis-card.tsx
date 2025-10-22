import type { ScoreModifier } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import React from 'react';

interface AnalysisCardProps {
  modifiers: ScoreModifier[];
}

export function AnalysisCard({ modifiers }: AnalysisCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Analysis Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {modifiers.map((modifier, index) => {
            const isPositive = modifier.change > 0;
            const Icon = LucideIcons[modifier.icon] as React.ElementType;

            return (
              <li key={index} className="flex items-start gap-4">
                <div className={cn(
                  "rounded-full p-2 flex-shrink-0 mt-1",
                  isPositive ? 'bg-primary/10' : 'bg-destructive/10'
                )}>
                  {Icon && <Icon className={cn(
                    "h-5 w-5",
                    isPositive ? 'text-primary' : 'text-destructive'
                  )} aria-hidden="true" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{modifier.factor}</h3>
                    <span className={cn(
                      "font-bold text-sm",
                      isPositive ? 'text-primary' : 'text-destructive'
                    )}>
                      ({modifier.change > 0 ? '+' : ''}{modifier.change})
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">{modifier.reason}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
