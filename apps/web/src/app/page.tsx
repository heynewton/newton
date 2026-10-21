import Image from "next/image";
import Link from "next/link";

const atHome = [
  "Forward an email or invoice to your boat's address, and Newton files it.",
  "Renewals and maintenance come with reminders before they're due.",
  "Co-owners see who paid what and who owes whom.",
  "Ask about the boat and get answers from its manuals, with the page they came from.",
];

const onTheWater = [
  "“Hey Newton, when is high water?”",
  "“Hey Newton, how far to the next mark?”",
  "“Hey Newton, what's the target wind angle?”",
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/icon.svg" alt="" width={32} height={32} />
          Hey Newton
        </Link>
        <Link
          href="/sign-in"
          className="rounded-full px-4 py-3 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 pt-10 pb-16 sm:pt-20">
        <section className="flex flex-col items-start gap-6">
          <Image src="/icon.svg" alt="Hey Newton logo" width={72} height={72} priority />
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            The AI assistant that knows your boat inside out.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            On the water, say &ldquo;Hey Newton&rdquo; and get answers out loud. At home,
            Newton helps owners with maintenance, documents and navigation planning.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/get-started"
              className="rounded-full bg-navy px-6 py-3 text-center font-medium text-white hover:bg-navy/90 dark:bg-teal dark:text-navy dark:hover:bg-teal/90"
            >
              Try the alpha for free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-black/15 px-6 py-3 text-center font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section aria-labelledby="what-is" className="flex flex-col gap-6">
          <h2 id="what-is" className="text-2xl font-semibold">
            What is Hey Newton?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/10 p-6 dark:border-white/15">
              <h3 className="text-lg font-semibold">At home</h3>
              <ul className="mt-4 flex flex-col gap-3 text-zinc-700 dark:text-zinc-300">
                {atHome.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-black/10 p-6 dark:border-white/15">
              <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                On the water
                <span className="rounded-full bg-spinnaker/20 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-spinnaker">
                  Coming soon
                </span>
              </h3>
              <p className="mt-4 text-zinc-700 dark:text-zinc-300">
                Ask out loud, hands on the helm. Newton answers from your instruments, tides,
                weather, charts and your boat&apos;s own documents, even without signal.
              </p>
              <ul className="mt-4 flex flex-col gap-2 font-medium">
                {onTheWater.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Newton supports the skipper; it doesn&apos;t replace them.
          </p>
        </section>
      </main>

    </div>
  );
}
