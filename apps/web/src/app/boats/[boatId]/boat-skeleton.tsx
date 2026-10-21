import type { ReactNode } from "react";
import { Bone, LoadingLabel } from "../../skeleton";

const card = "rounded-2xl border border-black/10 p-5 dark:border-white/15";

// A boat's home while it loads, in the shape of its sections: the name, renewals and maintenance,
// the co-owner balance, documents and next steps.
export function BoatSkeleton() {
  return (
    <>
      <LoadingLabel>Loading the boat…</LoadingLabel>
      <div aria-hidden className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <Bone className="h-9 w-64 max-w-full sm:h-10" />
          <Bone className="h-5 w-40" />
        </div>

        <Section>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <li key={i} className={`${card} flex flex-col gap-2`}>
                <Bone className="h-5 w-3/4" />
                <Bone className="h-5 w-1/2" />
                <Bone className="h-4 w-2/3" />
              </li>
            ))}
          </ul>
        </Section>

        <Section>
          <div className={`${card} flex flex-col gap-3`}>
            <Bone className="h-5 w-2/3" />
            <Bone className="h-5 w-1/2" />
          </div>
        </Section>

        <Section>
          <ul className="flex flex-col divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/15 dark:border-white/15">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex min-h-14 items-center justify-between gap-4 px-5 py-3">
                <Bone className="h-5 w-48 max-w-full" />
                <Bone className="hidden h-4 w-32 sm:block" />
              </li>
            ))}
          </ul>
        </Section>

        <Section>
          <ul className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className={`${card} flex flex-col gap-2`}>
                <Bone className="h-5 w-3/4" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-2/3" />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Bone className="h-7 w-56 max-w-full" />
      {children}
    </div>
  );
}
