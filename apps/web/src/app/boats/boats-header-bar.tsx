"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import type { BoatMembership } from "@/lib/db";
import { Menu } from "./menu";
import { menuItem } from "./menu-item";
import { roleNames } from "./roles";

// The parts of the /boats header that depend on which boat is open. A layout doesn't get its
// child segments' params, so the boat comes from the URL here.
export function BoatSwitcher({ boats }: { boats: BoatMembership[] }) {
  const { boatId } = useParams<{ boatId?: string }>();
  const current = boats.find((b) => b.boatId === boatId);

  // One boat: its name, linking home. No boat (or none open): nothing to switch to.
  if (boats.length < 2) {
    const only = current ?? boats[0];
    if (!only) return null;
    return (
      <Link href={`/boats/${only.boatId}`} className={`${menuItem} min-w-0`}>
        <span className="truncate">{only.boatName}</span>
      </Link>
    );
  }

  return (
    <Menu
      label={current ? `${current.boatName}, switch boat` : "Switch boat"}
      button={<span className="truncate">{current?.boatName ?? "Your boats"}</span>}
    >
      <p className="px-3 pt-1 text-sm text-zinc-600 dark:text-zinc-400">Your boats</p>
      <ul className="flex flex-col gap-1">
        {boats.map((boat) => (
          <li key={boat.boatId}>
            <Link
              href={`/boats/${boat.boatId}`}
              aria-current={boat.boatId === current?.boatId ? "true" : undefined}
              className={`${menuItem} justify-between gap-3 aria-[current]:bg-black/5 dark:aria-[current]:bg-white/10`}
            >
              <span className="min-w-0 break-words">{boat.boatName}</span>
              <span className="shrink-0 text-sm font-normal text-zinc-600 dark:text-zinc-400">
                {roleNames[boat.role]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Menu>
  );
}

// Who is signed in, the open boat's settings, adding a boat and signing out. `settingsFor` lists
// the boats whose settings page the person may open (the page checks again); `signOut` is the
// server-rendered form.
export function AccountMenu({
  name,
  settingsFor,
  signOut,
}: {
  name: string;
  settingsFor: string[];
  signOut: ReactNode;
}) {
  const { boatId } = useParams<{ boatId?: string }>();
  return (
    <Menu
      align="end"
      button={
        <>
          <PersonIcon />
          <span className="sr-only sm:not-sr-only">Account</span>
        </>
      }
    >
      <p className="px-3 pt-1 text-sm break-all text-zinc-600 dark:text-zinc-400">Signed in as {name}</p>
      {boatId && settingsFor.includes(boatId) && (
        <Link href={`/boats/${boatId}/settings`} className={menuItem}>
          Boat settings
        </Link>
      )}
      <Link href="/boats/new" className={menuItem}>
        Add a boat
      </Link>
      <div className="border-t border-black/10 pt-1 dark:border-white/15">{signOut}</div>
    </Menu>
  );
}

function PersonIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-6 shrink-0">
      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
    </svg>
  );
}
