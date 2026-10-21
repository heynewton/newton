import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentPerson, listMyBoats } from "@/lib/db";
import { canExport } from "@/lib/db/export";
import { AccountMenu, BoatSwitcher, SignInLink } from "./header-menus";
import { menuItem } from "./menu-item";
import { SignOut } from "./sign-out";

// Shown on every page from the root layout (#155): the logo back to the homepage on the left, the
// open boat with a switcher on /boats/*, and the profile on the right. The logo is static, so
// pages like privacy and terms are prerendered with it; who is signed in streams in after.
export function SiteHeader() {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-1 px-2 py-2 sm:px-4">
        {/* A signed-in person is sent on from / to their boats by the proxy. */}
        <Link href="/" className={`${menuItem} shrink-0 gap-2 px-1.5`}>
          <Image src="/icon.svg" alt="" width={32} height={32} />
          <span className="sr-only sm:not-sr-only">Hey Newton</span>
        </Link>
        <Suspense fallback={<div className="flex-1" />}>
          <Profile />
        </Suspense>
      </div>
    </header>
  );
}

// Reading the session must never break a page, so a failed read shows the signed-out header.
async function Profile() {
  const person = await getCurrentPerson().catch(() => null);
  if (!person) {
    return (
      <div className="flex flex-1 justify-end">
        <SignInLink />
      </div>
    );
  }
  const boats = await listMyBoats(person).catch(() => []);
  return (
    <>
      <div className="flex min-w-0 flex-1">
        <BoatSwitcher boats={boats} />
      </div>
      <AccountMenu
        name={person.displayName ?? person.email ?? "you"}
        // Boat settings holds export and delete, so it's for those who can export (#142).
        settingsFor={boats.filter((b) => canExport(b.role)).map((b) => b.boatId)}
        signOut={<SignOut />}
      />
    </>
  );
}
