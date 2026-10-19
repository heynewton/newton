import { buildDigests, renderDigest, type Digest, type Email, type ReminderBoat } from "./index";

// The daily reminders job: build the digests, send each one, remember what was in it. The
// database and the mail provider are passed in (`@/lib/db/reminders`, `./resend`).

export interface ReminderStore {
  // Every boat with renewals or maintenance, and its owners and co-owners.
  loadBoats(): Promise<ReminderBoat[]>;
  // Keys (see sentKey) of every reminder already sent.
  loadSent(): Promise<Set<string>>;
  recordSent(digest: Digest): Promise<void>;
}

export interface Mailer {
  // The idempotency key makes a retried send of the same digest a no-op at the provider.
  send(to: string, email: Email, idempotencyKey: string): Promise<void>;
}

export type RunResult = { digests: number; sent: number; failed: { personId: string; error: string }[] };

export async function runReminders(deps: {
  store: ReminderStore;
  mailer: Mailer;
  today: string;
  siteUrl: string;
}): Promise<RunResult> {
  const { store, mailer, today, siteUrl } = deps;
  const [boats, sent] = await Promise.all([store.loadBoats(), store.loadSent()]);
  const digests = buildDigests(boats, sent, today);
  const result: RunResult = { digests: digests.length, sent: 0, failed: [] };

  // One person's failure doesn't stop the others; they get theirs on the next run.
  for (const digest of digests) {
    const { personId, email } = digest.recipient;
    try {
      await mailer.send(email, renderDigest(digest, siteUrl), `reminders/${personId}/${today}`);
      await store.recordSent(digest);
      result.sent += 1;
    } catch (error) {
      result.failed.push({ personId, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}
