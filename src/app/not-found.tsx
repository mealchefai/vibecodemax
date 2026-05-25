import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-container-mobile py-section-mobile md:px-container md:py-section">
        <section className="w-full rounded-3xl border border-border bg-surface/80 p-8 md:p-12">
          <div className="mb-6 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            404
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Page not found
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary md:text-lg">
            The page you requested does not exist or may have moved.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="px-6">
              <Link href="/">Go to the main page</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
