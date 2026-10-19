import { NextResponse } from "next/server";
import { reminderStoreFromEnv } from "@/lib/db/reminders";
import { ResendMailer } from "@/lib/reminders/resend";
import { runReminders } from "@/lib/reminders/run";
import { todayUtc } from "@/lib/records";

// The daily reminders job (#12), called by Vercel Cron (apps/web/vercel.json,
// docs/decisions/0005-scheduled-jobs.md). Vercel sends `Authorization: Bearer <CRON_SECRET>`;
// anything else is refused, so nobody else can make Newton send email.

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = reminderStoreFromEnv();
  const apiKey = process.env.RESEND_API_KEY;
  const siteUrl = process.env.SITE_URL;
  if (!store || !apiKey || !siteUrl) {
    return NextResponse.json({ error: "Reminders are not set up here" }, { status: 503 });
  }

  const result = await runReminders({
    store,
    mailer: new ResendMailer(apiKey, process.env.REMINDERS_FROM || undefined, process.env.RESEND_API_URL || undefined),
    today: todayUtc(new Date()),
    siteUrl,
  });
  if (result.failed.length) console.error("reminders: some digests failed", result.failed);
  return NextResponse.json(result, { status: result.failed.length ? 500 : 200 });
}
