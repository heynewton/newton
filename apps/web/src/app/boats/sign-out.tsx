import { redirect } from "next/navigation";
import { signOut, type Person } from "@/lib/db";

// "Signed in as …" and a sign-out button, at the bottom of the signed-in pages.
export function SignOut({ person }: { person: Person }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
        redirect("/");
      }}
      className="flex flex-wrap items-center gap-x-3 text-sm text-zinc-600 dark:text-zinc-400"
    >
      <span className="break-all">Signed in as {person.displayName ?? person.email}</span>
      <button type="submit" className="min-h-11 font-medium underline">
        Sign out
      </button>
    </form>
  );
}
