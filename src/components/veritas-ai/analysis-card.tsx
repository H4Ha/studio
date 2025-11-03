import type {ScoreModifier} from '@/lib/types';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import React from 'react';
import {Info} from 'lucide-react';

interface AnalysisCardProps {
  modifiers: ScoreModifier[];
}

const fallbackIcon = 'HelpCircle';
const dimensionOrder: {name: string; description: string}[] = [
  {
    name: 'Transparency & Accountability',
    description: 'Checks for institutional honesty, policies, and disclosures.',
  },
  {
    name: 'Authority & Sourcing',
    description: 'Evaluates authorship clarity and sourcing provenance.',
  },
  {
    name: 'Accuracy & Verifiability',
    description: 'Reviews evidence, sourcing depth, and fact/opinion separation.',
  },
  {
    name: 'Objectivity & Tone',
    description: 'Flags rhetorical bias, sensational tone, and loaded language.',
  },
  {
    name: 'Presentation & Currency',
    description: 'Assesses timeliness, readability, and presentation quality cues.',
  },
];

function resolveIcon(iconName: string): LucideIcon {
  const iconCandidate = LucideIcons[iconName as keyof typeof LucideIcons];
  if (typeof iconCandidate === 'function') {
    return iconCandidate as LucideIcon;
  }
  return LucideIcons[fallbackIcon as keyof typeof LucideIcons] as LucideIcon;
}

export function AnalysisCard({modifiers}: AnalysisCardProps) {
  const grouped = modifiers.reduce<Record<string, ScoreModifier[]>>((acc, modifier) => {
    if (!acc[modifier.dimension]) {
      acc[modifier.dimension] = [];
    }
    acc[modifier.dimension].push(modifier);
    return acc;
  }, {});

  return (
    <Card className="shadow-lg bg-card/70 dark:bg-card/50 backdrop-blur-sm border border-border/20">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-3">
          <Info className="text-primary" />
          Analysis Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-6">
        {dimensionOrder.map(({name, description}) => {
          const dimensionModifiers = grouped[name] || [];
          if (dimensionModifiers.length === 0) return null;

          const dimensionChange = dimensionModifiers.reduce((total, modifier) => total + modifier.change, 0);
          const isPositiveDimension = dimensionChange > 0;
          const dimensionBadgeVariant = dimensionChange === 0 ? 'secondary' : isPositiveDimension ? 'default' : 'destructive';

          return (
            <section key={name} className="space-y-3">
              <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    {name}
                    <Badge variant={dimensionBadgeVariant} className="text-xs">
                      {dimensionChange >= 0 ? '+' : ''}{dimensionChange.toFixed(1)} pts
                    </Badge>
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
                </div>
              </header>
              <ul className="space-y-3">
                {dimensionModifiers.map((modifier, index) => {
                  const isPositive = modifier.change > 0;
                  const IconComponent = resolveIcon(modifier.icon ?? fallbackIcon);

                  return (
                    <li
                      key={`${modifier.factor}-${index}`}
                      className="flex items-start gap-4 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
                    >
                      <div
                        className={cn(
                          'rounded-full p-2 flex-shrink-0 mt-1',
                          modifier.change === 0 ? 'bg-muted/50' : isPositive ? 'bg-primary/10' : 'bg-destructive/10'
                        )}
                      >
                        {IconComponent && (
                          <IconComponent
                            className={cn(
                              'h-5 w-5',
                              modifier.change === 0 ? 'text-muted-foreground' : isPositive ? 'text-primary' : 'text-destructive'
                            )}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm sm:text-base">{modifier.factor}</span>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            {modifier.severity}
                          </Badge>
                          <span
                            className={cn(
                              'font-bold text-xs sm:text-sm',
                              modifier.change === 0
                                ? 'text-muted-foreground'
                                : isPositive
                                  ? 'text-primary'
                                  : 'text-destructive'
                            )}
                          >
                            ({modifier.change > 0 ? '+' : ''}{modifier.change})
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{modifier.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
