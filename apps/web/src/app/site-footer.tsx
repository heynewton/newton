import Link from "next/link";

// Shown on every page from the root layout.
export function SiteFooter() {
  const releaseTag = process.env.NEXT_PUBLIC_NEWTON_RELEASE_TAG;
  const buildSha = process.env.NEXT_PUBLIC_NEWTON_BUILD_SHA;
  const pullRequestNumber = process.env.NEXT_PUBLIC_NEWTON_PR_NUMBER;

  return (
    <footer className="border-t border-black/10 dark:border-white/15">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Hey Newton is open source under the{" "}
          <a className="underline" href="https://github.com/heynewton/newton/blob/main/LICENSE">
            AGPL-3.0
          </a>
          .
        </p>
        <nav aria-label="Legal and source" className="-my-3 flex gap-4">
          <Link className="inline-block py-3 hover:underline" href="/privacy">
            Privacy
          </Link>
          <Link className="inline-block py-3 hover:underline" href="/terms">
            Terms
          </Link>
          <a className="inline-block py-3 hover:underline" href="https://github.com/heynewton/newton">
            GitHub
          </a>
        </nav>
        {(releaseTag || buildSha) && (
          <p className="text-xs">
            Version:{" "}
            {releaseTag ? (
              <a
                className="hover:underline"
                href={`https://github.com/heynewton/newton/releases/tag/${encodeURIComponent(releaseTag)}`}
              >
                {releaseTag}
              </a>
            ) : (
              <>
                <a className="hover:underline" href={`https://github.com/heynewton/newton/commit/${buildSha}`}>
                  {buildSha?.slice(0, 7)}
                </a>
                {pullRequestNumber && (
                  <>
                    {" "}
                    <a
                      className="hover:underline"
                      href={`https://github.com/heynewton/newton/pull/${pullRequestNumber}`}
                    >
                      (#{pullRequestNumber})
                    </a>
                  </>
                )}
              </>
            )}
          </p>
        )}
      </div>
    </footer>
  );
}
