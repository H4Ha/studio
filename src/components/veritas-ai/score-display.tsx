'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card className="text-center shadow-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Credibility Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative inline-flex items-center justify-center w-[120px] h-[120px]">
          <svg className="w-full h-full" viewBox="0 0 120 120">
            <circle
              className="text-muted/30"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="52"
              cx="60"
              cy="60"
            />
            <circle
              className="transform -rotate-90 origin-center"
              strokeWidth="8"
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
          <span className={`absolute text-4xl font-bold font-headline`} style={{ color: scoreColor }}>
            {animatedScore}
          </span>
        </div>
        <p className="text-muted-foreground mt-4 max-w-sm mx-auto">
          A score from 0 to 100 indicating the trustworthiness of the content based on available data.
        </p>
      </CardContent>
    </Card>
  );
}
