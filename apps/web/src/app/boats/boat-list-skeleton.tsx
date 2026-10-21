import { Bone, LoadingLabel } from "../skeleton";

// The list on /boats while it loads: one row per boat, in the shape of the real rows.
export function BoatListSkeleton() {
  return (
    <>
      <LoadingLabel>Loading your boats…</LoadingLabel>
      <ul aria-hidden className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <li
            key={i}
            className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-black/10 px-5 py-3 dark:border-white/15"
          >
            <Bone className="h-5 w-40" />
            <Bone className="h-4 w-16" />
          </li>
        ))}
      </ul>
    </>
  );
}
