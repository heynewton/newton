"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusScreen, primaryAction, secondaryAction } from "./status-screen";

// Any page that fails to render, usually a database call. The error itself stays in the server
// logs: nothing technical is shown here.
export default function ErrorScreen({ retry }: { error: unknown; retry: () => void }) {
  const inApp = usePathname().startsWith("/boats");
  return (
    <StatusScreen
      title="Newton couldn't load this"
      actions={
        <>
          <button type="button" onClick={() => retry()} className={`${primaryAction} cursor-pointer`}>
            Try again
          </button>
          <Link href={inApp ? "/boats" : "/"} className={secondaryAction}>
            {inApp ? "Your boats" : "Back to the homepage"}
          </Link>
        </>
      }
    >
      <p>Something went wrong on our side, not yours.</p>
      <p>Try again in a moment. If it keeps happening, come back a little later.</p>
    </StatusScreen>
  );
}
