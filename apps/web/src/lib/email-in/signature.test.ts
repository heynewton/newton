import { describe, expect, it } from "vitest";
import { signPayload, signatureHeaders, verifySignature } from "./signature";

// A made-up secret in Resend's format, not a real one.
const secret = `whsec_${Buffer.from("not-a-real-secret-for-tests-only").toString("base64")}`;
const body = JSON.stringify({ type: "email.received", data: { email_id: "e1" } });
const now = new Date("2026-10-19T12:00:00Z");
const timestamp = String(now.getTime() / 1000);
const signed = (overrides: Partial<{ id: string; timestamp: string; signature: string }> = {}) => ({
  id: "msg_1",
  timestamp,
  signature: `v1,${signPayload(secret, "msg_1", timestamp, body)}`,
  ...overrides,
});

describe("verifySignature", () => {
  it("accepts a request signed with the secret", () => {
    expect(verifySignature(secret, signed(), body, now)).toBe(true);
  });

  it("accepts any of several signatures, as during a secret rotation", () => {
    const signature = `v1,${Buffer.from("old").toString("base64")} ${signed().signature}`;
    expect(verifySignature(secret, signed({ signature }), body, now)).toBe(true);
  });

  it("refuses a changed body, ID or timestamp", () => {
    expect(verifySignature(secret, signed(), body.replace("e1", "e2"), now)).toBe(false);
    expect(verifySignature(secret, signed({ id: "msg_2" }), body, now)).toBe(false);
    expect(verifySignature(secret, signed({ timestamp: String(Number(timestamp) + 1) }), body, now)).toBe(false);
  });

  it("refuses another secret", () => {
    const other = `whsec_${Buffer.from("another-secret").toString("base64")}`;
    expect(verifySignature(other, signed(), body, now)).toBe(false);
  });

  it("refuses a request more than five minutes old or ahead", () => {
    expect(verifySignature(secret, signed(), body, new Date(now.getTime() + 5 * 60_000))).toBe(true);
    expect(verifySignature(secret, signed(), body, new Date(now.getTime() + 5 * 60_000 + 1000))).toBe(false);
    expect(verifySignature(secret, signed(), body, new Date(now.getTime() - 5 * 60_000 - 1000))).toBe(false);
  });

  it("refuses missing headers, other versions and junk", () => {
    expect(verifySignature(secret, { id: null, timestamp, signature: signed().signature }, body, now)).toBe(false);
    expect(verifySignature(secret, signed({ signature: signed().signature.replace("v1,", "v2,") }), body, now)).toBe(false);
    expect(verifySignature(secret, signed({ signature: "v1," }), body, now)).toBe(false);
    expect(verifySignature(secret, signed({ timestamp: "soon" }), body, now)).toBe(false);
    expect(verifySignature("", signed(), body, now)).toBe(false);
  });
});

describe("signatureHeaders", () => {
  it("reads Resend's svix-* headers, or the webhook-* names", () => {
    const svix = new Headers({ "svix-id": "a", "svix-timestamp": "1", "svix-signature": "v1,x" });
    expect(signatureHeaders(svix)).toEqual({ id: "a", timestamp: "1", signature: "v1,x" });
    const standard = new Headers({ "webhook-id": "b", "webhook-timestamp": "2", "webhook-signature": "v1,y" });
    expect(signatureHeaders(standard)).toEqual({ id: "b", timestamp: "2", signature: "v1,y" });
  });
});
