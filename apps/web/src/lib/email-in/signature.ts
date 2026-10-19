import { createHmac, timingSafeEqual } from "node:crypto";

// Checks that a webhook request really comes from Resend. Resend signs webhooks the Svix way
// (https://docs.svix.com/receiving/verifying-payloads/how-manual): an HMAC-SHA256 of
// `<id>.<timestamp>.<raw body>` with the endpoint's secret (`whsec_<base64>`), sent as one or
// more space-separated `v1,<base64>` values. The timestamp must be recent, so a captured request
// can't be replayed later.

export type SignatureHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

// Resend sends the `svix-*` names; the Standard Webhooks `webhook-*` names are accepted too.
export function signatureHeaders(headers: Headers): SignatureHeaders {
  return {
    id: headers.get("svix-id") ?? headers.get("webhook-id"),
    timestamp: headers.get("svix-timestamp") ?? headers.get("webhook-timestamp"),
    signature: headers.get("svix-signature") ?? headers.get("webhook-signature"),
  };
}

export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export function signPayload(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

export function verifySignature(
  secret: string,
  headers: SignatureHeaders,
  body: string,
  now: Date = new Date(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  if (!/^\d+$/.test(timestamp)) return false;
  const age = Math.abs(now.getTime() / 1000 - Number(timestamp));
  if (age > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(signPayload(secret, id, timestamp, body), "base64");
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
