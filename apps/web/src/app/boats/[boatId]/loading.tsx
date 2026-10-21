import { BoatSkeleton } from "./boat-skeleton";

// Shown straight away when opening a boat, while its records load. Same frame as its page.tsx.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col gap-10 px-4 py-10 sm:py-16">
      <BoatSkeleton />
    </main>
  );
}
