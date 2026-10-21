import Image from "next/image";
import Link from "next/link";

// Stands in for sign-in where no database is configured (previews).
export function AuthPlaceholder({ title }: { title: string }) {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-md flex-col justify-center gap-4 px-4 py-16">
      <Image src="/icon.svg" alt="Hey Newton logo" width={56} height={56} />
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Accounts aren&apos;t open yet. Sign-in with an email link is being built and will
        appear here.
      </p>
      <Link href="/" className="font-medium underline">
        Back to the homepage
      </Link>
    </main>
  );
}
