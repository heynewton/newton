"use client";

import { useState } from "react";

// The boat's email address with a Copy button, so nobody has to long-press to select it on a
// phone. The result is announced through role="status".
export function CopyAddress({ address }: { address: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <a
        href={`mailto:${address}`}
        className="inline-flex min-h-11 items-center font-semibold break-words underline"
      >
        {address}
      </a>
      <span className="flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="flex min-h-11 items-center rounded-full border border-black/15 px-5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Copy
        </button>
        <span role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy. Select the address instead." : ""}
        </span>
      </span>
    </div>
  );
}
