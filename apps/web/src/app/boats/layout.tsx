import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentPerson, listMyBoats } from "@/lib/db";
import { AccountMenu, BoatSwitcher } from "./boats-header-bar";
import { menuItem } from "./menu-item";
import { SignOut } from "./sign-out";

// Every signed-in page shares this header (#133): the logo back to the person's boats, the open
// boat with a switcher when they're on several, and the account menu.
export default function BoatsLayout({ children }: LayoutProps<"/boats">) {
  return (
    <>
      <header className="border-b border-black/10 dark:border-white/15">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-1 px-2 py-2 sm:px-4">
          <Link href="/boats" className={`${menuItem} shrink-0 px-1.5`}>
            <Image src="/icon.svg" alt="Hey Newton, your boats" width={32} height={32} />
          </Link>
          <Suspense>
            <SignedInHeader />
          </Suspense>
        </div>
      </header>
      {children}
    </>
  );
}

// Signed-out visitors get only the logo; each page sends them to sign in.
async function SignedInHeader() {
  const person = await getCurrentPerson();
  if (!person) return null;
  const boats = await listMyBoats(person);
  return (
    <>
      <div className="flex min-w-0 flex-1">
        <BoatSwitcher boats={boats} />
      </div>
      <AccountMenu name={person.displayName ?? person.email ?? "you"} signOut={<SignOut />} />
    </>
  );
}
