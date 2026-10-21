import { Bone } from "../skeleton";
import { BoatListSkeleton } from "./boat-list-skeleton";

// Shown straight away when opening /boats, while the boats load. Same frame as boats/page.tsx.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col gap-6 px-4 py-16">
      <Bone className="h-9 w-48" />
      <BoatListSkeleton />
    </main>
  );
}
