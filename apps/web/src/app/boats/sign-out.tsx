import { redirect } from "next/navigation";
import { signOut } from "@/lib/db";
import { menuItem } from "./menu-item";

// The sign-out button in the header's account menu.
export function SignOut() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
        redirect("/");
      }}
    >
      <button type="submit" className={`${menuItem} w-full`}>
        Sign out
      </button>
    </form>
  );
}
