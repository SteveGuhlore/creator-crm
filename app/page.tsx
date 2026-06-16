import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Creator CRM</h1>
      <p className="max-w-xl text-muted-foreground">
        Per-platform creator management dashboard. Built against mock &amp; CSV
        data only.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
