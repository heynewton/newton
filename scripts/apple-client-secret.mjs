// Makes the client secret Supabase Auth needs for Sign in with Apple on the web (#27): a JWT signed
// with the Sign in with Apple key, which Apple accepts for at most 6 months. Prints only the
// token, so it can be piped straight into the Supabase Management API (docs/tokens.md).
//
//   node scripts/apple-client-secret.mjs <key.p8> <team ID> <key ID> <Services ID>
//
// The expiry date goes to stderr, so it can be noted for the renewal reminder.
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

// Apple's limit is 15777000 seconds (about 182 days); stay a day under it.
const LIFETIME_SECONDS = 15777000 - 24 * 60 * 60;

export function appleClientSecret({ privateKeyPem, teamId, keyId, servicesId, now = new Date() }) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + LIFETIME_SECONDS;
  const encode = (part) => Buffer.from(JSON.stringify(part)).toString("base64url");
  const unsigned = `${encode({ alg: "ES256", kid: keyId })}.${encode({
    iss: teamId,
    iat: issuedAt,
    exp: expiresAt,
    aud: "https://appleid.apple.com",
    sub: servicesId,
  })}`;
  // JWTs carry the raw r||s signature, not the DER that Node signs with by default.
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: createPrivateKey(privateKeyPem),
    dsaEncoding: "ieee-p1363",
  });
  return { token: `${unsigned}.${signature.toString("base64url")}`, expiresAt: new Date(expiresAt * 1000) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [keyPath, teamId, keyId, servicesId] = process.argv.slice(2);
  if (!keyPath || !teamId || !keyId || !servicesId) {
    console.error("Usage: node scripts/apple-client-secret.mjs <key.p8> <team ID> <key ID> <Services ID>");
    process.exit(1);
  }
  const { token, expiresAt } = appleClientSecret({
    privateKeyPem: readFileSync(keyPath, "utf8"),
    teamId,
    keyId,
    servicesId,
  });
  console.error(`Expires ${expiresAt.toISOString().slice(0, 10)}: renew before then.`);
  process.stdout.write(token);
}
