import VeritasAiLogo from './logo';

export function Header() {
  return (
    <header className="py-8 md:py-12">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <VeritasAiLogo className="size-10 text-primary" />
        <h1 className="text-4xl font-bold tracking-tighter font-headline text-center sm:text-5xl text-foreground">
          VeritasAI
        </h1>
      </div>
      <p className="text-center text-muted-foreground mt-3 max-w-md mx-auto">
        Your AI-powered assistant for navigating the truth in a complex digital world.
      </p>
    </header>
  );
}
