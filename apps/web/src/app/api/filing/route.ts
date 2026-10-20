import { NextResponse } from "next/server";
import { filingStoreFromEnv } from "@/lib/db/filing";
import { fileWaiting, filingModelFromEnv } from "@/lib/filing";

// The daily filing run (#11), called by Vercel Cron (apps/web/vercel.json): files documents that
// are still waiting, because their filing failed or never ran after email-in. Vercel sends
// `Authorization: Bearer <CRON_SECRET>`; anything else is refused, so nobody else can spend the
// boat's Claude budget.

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = filingStoreFromEnv();
  const model = filingModelFromEnv();
  if (!store || !model) {
    return NextResponse.json({ error: "Filing is not set up here" }, { status: 503 });
  }

  const results = await fileWaiting({ store, model });
  const failed = results.filter((r) => r.outcome === "failed");
  if (failed.length) console.error("filing: some documents failed", failed);
  return NextResponse.json({ documents: results.length, results }, { status: failed.length ? 500 : 200 });
}
