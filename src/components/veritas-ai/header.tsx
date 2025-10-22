import VeritasAiLogo from './logo';

export function Header() {
  return (
    <header className="py-8">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <VeritasAiLogo className="size-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline text-center sm:text-4xl text-foreground">
          VeritasAI
        </h1>
      </div>
      <p className="text-center text-muted-foreground mt-2">
        AI-powered content credibility analysis.
      </p>
    </header>
  );
}
