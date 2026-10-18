import Link from "next/link";

// Stands in for the privacy policy and terms until they are written.
export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        This page is being written and will be published before accounts open. Until then,
        Hey Newton holds no accounts and no personal data.
      </p>
      <Link href="/" className="font-medium underline">
        Back to the homepage
      </Link>
    </main>
  );
}
