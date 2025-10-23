'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Moon, Sun, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Theme = 'light' | 'dark' | 'system';

export function ThemeSwitcher() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

  if (!isMounted) {
    // Render a placeholder or null on the server to avoid hydration mismatch
    return <div className="fixed bottom-5 right-5 z-50 w-[52px] h-[52px]" />;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-14 w-14 rounded-full shadow-lg border-border/50 bg-card/80 backdrop-blur-sm hover:bg-accent/50 hover:scale-105 transition-transform duration-200">
            <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="mb-2">
          <DropdownMenuItem onClick={() => setTheme('light')} className={cn(theme === 'light' && 'bg-accent')}>
            <Sun className="mr-2" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')} className={cn(theme === 'dark' && 'bg-accent')}>
            <Moon className="mr-2" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')} className={cn(theme === 'system' && 'bg-accent')}>
            <Laptop className="mr-2" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
