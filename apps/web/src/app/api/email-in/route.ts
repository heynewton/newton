import { NextResponse } from "next/server";
import { emailInStoreFromEnv } from "@/lib/db/email-in";
import { receiveEmail, type ReceivedEvent } from "@/lib/email-in";
import { ResendMailProvider } from "@/lib/email-in/resend";
import { signatureHeaders, verifySignature } from "@/lib/email-in/signature";

// Resend's webhook for mail sent to a boat's address (#10, docs/decisions/0003-email-provider.md).
// A 2xx tells Resend the message is handled; anything else makes it retry later, so errors that
// a retry could fix (database, storage, Resend's API) return 500, and everything else 200.

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN;
  const store = emailInStoreFromEnv();
  if (!secret || !apiKey || !inboundDomain || !store) {
    return NextResponse.json({ error: "Email-in is not set up here" }, { status: 503 });
  }

  const body = await request.text();
  if (!verifySignature(secret, signatureHeaders(request.headers), body)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let event: { type?: string };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Not JSON" }, { status: 400 });
  }
  if (event.type !== "email.received") {
    return NextResponse.json({ outcome: "ignored" });
  }

  try {
    const result = await receiveEmail(event as ReceivedEvent, {
      provider: new ResendMailProvider(apiKey, process.env.RESEND_API_URL || undefined),
      store,
      inboundDomain,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("email-in failed", error);
    return NextResponse.json({ error: "Failed, will retry" }, { status: 500 });
  }
}
