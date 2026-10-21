import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

// The 404 and error screens: the site's header, a heading, what happened and what to do next.
export function StatusScreen({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center px-4 py-4">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold">
          <Image src="/icon.svg" alt="" width={32} height={32} />
          Hey Newton
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-10 pb-16 sm:pt-20">
        <h1 className="max-w-2xl text-3xl font-semibold sm:text-4xl">{title}</h1>
        <div className="flex max-w-2xl flex-col gap-3 text-lg text-zinc-600 dark:text-zinc-400">{children}</div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div>
      </main>
    </div>
  );
}

// The homepage's two button styles, for links and buttons on these screens.
export const primaryAction =
  "rounded-full border border-transparent bg-navy px-6 py-3 text-center font-medium text-white hover:bg-navy/90 dark:bg-teal dark:text-navy dark:hover:bg-teal/90";
export const secondaryAction =
  "rounded-full border border-black/15 px-6 py-3 text-center font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";
