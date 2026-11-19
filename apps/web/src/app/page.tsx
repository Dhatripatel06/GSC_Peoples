import { Users } from 'lucide-react';

// Foundation placeholder. The real dashboard lives in the (dashboard) route group later.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Users className="size-5" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">GSC Peoples</h1>
      <p className="text-sm text-muted-foreground">
        HR &amp; People CRM for the GrowSpark Consulting Business Platform. Project foundation is
        ready.
      </p>
    </main>
  );
}
