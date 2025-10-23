'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface ScoreDisplayProps {
  score: number;
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    if (score > 0) {
      let start = 0;
      const end = score;
      const duration = 1000;
      let startTime: number | null = null;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const currentScore = Math.floor(progress * end);
        setAnimatedScore(currentScore);
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };
      animationFrameId = requestAnimationFrame(animate);
    } else {
      setAnimatedScore(0);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [score]);


  const circumference = 2 * Math.PI * 52; // 2 * pi * radius
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 75) return 'hsl(var(--chart-2))'; // Greenish
    if (score >= 40) return 'hsl(var(--chart-4))'; // Yellowish
    return 'hsl(var(--destructive))'; // Red
  };
  const scoreColor = getScoreColor();

  return (
    <Card className="text-center shadow-lg overflow-hidden bg-card/70 dark:bg-card/50 backdrop-blur-sm border border-border/20">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="font-headline text-lg sm:text-xl flex items-center justify-center gap-3">
          <CheckCircle2 className="text-primary" />
          Credibility Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="relative inline-flex items-center justify-center w-[120px] h-[120px] sm:w-[140px] sm:h-[140px]">
          <svg className="w-full h-full" viewBox="0 0 120 120">
            <circle
              className="text-muted/20"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
              r="52"
              cx="60"
              cy="60"
            />
            <circle
              className="transform -rotate-90 origin-center"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              strokeLinecap="round"
              stroke={scoreColor}
              fill="transparent"
              r="52"
              cx="60"
              cy="60"
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <span className={`absolute text-3xl sm:text-5xl font-bold font-headline`} style={{ color: scoreColor }}>
            {animatedScore}
          </span>
        </div>
        <p className="text-muted-foreground mt-3 sm:mt-4 max-w-sm mx-auto text-xs sm:text-sm">
          A score from 0 to 100 indicating the trustworthiness of the content based on available data.
        </p>
      </CardContent>
    </Card>
  );
}
