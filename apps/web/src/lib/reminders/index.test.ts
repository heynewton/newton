import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MaintenanceRow, RenewalRow } from "../records";
import { buildDigests, digestSubject, renderDigest, sentKey, type Digest, type ReminderBoat } from "./index";
import { runReminders, type Mailer, type ReminderStore } from "./run";

// The made-up sample boat Test boat (fixtures/sample-boat/boat.json), as the database holds it.
type Fixture = {
  boat: { id: string; name: string };
  people: { id: string; name: string; verifiedSenders: string[] }[];
  memberships: { personId: string; role: string }[];
  renewals: { id: string; kind: RenewalRow["kind"]; title: string; reference?: string; expiresOn: string; sourceDocument?: string }[];
  maintenance: {
    id: string;
    title: string;
    everyMonths?: number;
    everyEngineHours?: number;
    lastDoneOn: string;
    lastDoneEngineHours?: number;
    sourceDocument?: string;
  }[];
};
const fixture: Fixture = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "..", "..", "..", "fixtures", "sample-boat", "boat.json"), "utf8"),
);
const docId = (name: string) => `doc-${name}`;

function testBoat(): ReminderBoat {
  const documentNames = new Set([...fixture.renewals, ...fixture.maintenance].map((r) => r.sourceDocument).filter(Boolean));
  return {
    boatId: fixture.boat.id,
    boatName: fixture.boat.name,
    renewals: fixture.renewals.map(
      (r): RenewalRow => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        reference: r.reference ?? null,
        expires_on: r.expiresOn,
        document_id: r.sourceDocument ? docId(r.sourceDocument) : null,
      }),
    ),
    maintenance: fixture.maintenance.map(
      (m): MaintenanceRow => ({
        id: m.id,
        title: m.title,
        every_months: m.everyMonths ?? null,
        every_engine_hours: m.everyEngineHours ?? null,
        last_done_on: m.lastDoneOn,
        last_done_engine_hours: m.lastDoneEngineHours ?? null,
        document_id: m.sourceDocument ? docId(m.sourceDocument) : null,
      }),
    ),
    documents: [...documentNames].map((name) => ({ id: docId(name!), filename: `${name}.pdf` })),
    recipients: fixture.memberships
      .filter((m) => m.role === "owner" || m.role === "co-owner")
      .map((m) => {
        const person = fixture.people.find((p) => p.id === m.personId)!;
        return { personId: person.id, name: person.name, email: person.verifiedSenders[0] };
      }),
  };
}

const ALEX = "00000000-0000-4000-8000-000000000101";
const ANODES = "00000000-0000-4000-8000-000000000404";
const REGISTRATION = "00000000-0000-4000-8000-000000000302";

describe("buildDigests on Test boat", () => {
  it("on 19 Oct 2026, tells each owner and co-owner about the overdue anodes, and nobody else", () => {
    const digests = buildDigests([testBoat()], new Set(), "2026-10-19");

    expect(digests.map((d) => d.recipient.name)).toEqual(["Alex Sample", "Sam Placeholder", "Jordan Fictional"]);
    for (const digest of digests) {
      expect(digest.boats).toHaveLength(1);
      expect(digest.boats[0].items).toEqual([
        {
          boatId: fixture.boat.id,
          itemType: "maintenance",
          itemId: ANODES,
          title: "Zinc anodes in heat exchanger",
          status: "overdue",
          dueOn: "2026-10-18",
          dueAtEngineHours: 1471,
          due: "Was due 18 Oct 2026 or at 1,471 h, whichever comes first",
          basis: "Last done 18 Apr 2026 at 1,371 h, every 6 months or 100 h.",
          source: "Entered by hand, no source document linked.",
        },
      ]);
    }
  });

  it("adds the registration once it is within 30 days, with its source document", () => {
    const [alex] = buildDigests([testBoat()], new Set(), "2026-12-01");
    const registration = alex.boats[0].items.find((i) => i.itemId === REGISTRATION);
    expect(registration).toMatchObject({
      status: "due_soon",
      dueOn: "2026-12-31",
      due: "Expires 31 Dec 2026",
      basis: "Reference XX 0000 ZZ.",
      source: "From registration.pdf.",
    });
  });

  it("doesn't repeat what someone was already told, but tells others", () => {
    const sent = new Set([
      sentKey(ALEX, { itemType: "maintenance", itemId: ANODES, dueOn: "2026-10-18", dueAtEngineHours: 1471, status: "overdue" }),
    ]);
    const digests = buildDigests([testBoat()], sent, "2026-10-19");
    expect(digests.map((d) => d.recipient.personId)).not.toContain(ALEX);
    expect(digests).toHaveLength(2);
  });

  it("reminds again when a due-soon item becomes overdue, and when its due date moves", () => {
    const boat = testBoat();
    const soon = buildDigests([boat], new Set(), "2026-10-10")[0].boats[0].items.find((i) => i.itemId === ANODES)!;
    expect(soon.status).toBe("due_soon");
    const sent = new Set([sentKey(ALEX, soon)]);

    const later = buildDigests([boat], sent, "2026-10-19").find((d) => d.recipient.personId === ALEX)!;
    expect(later.boats[0].items.map((i) => [i.itemId, i.status])).toEqual([[ANODES, "overdue"]]);

    // Done again: a new due date, so it will come up again in its time, not now.
    sent.add(sentKey(ALEX, later.boats[0].items[0]));
    const anodes = boat.maintenance.find((m) => m.id === ANODES)!;
    anodes.last_done_on = "2026-10-19";
    anodes.last_done_engine_hours = 1420;
    expect(buildDigests([boat], sent, "2026-10-20")).toEqual([]);
    const april = buildDigests([boat], sent, "2027-04-01")[0].boats[0].items;
    expect(april.find((i) => i.itemId === ANODES)).toMatchObject({
      itemId: ANODES,
      status: "due_soon",
      dueOn: "2027-04-19",
    });
  });

  it("sends one digest per person across all their boats", () => {
    const second = { ...testBoat(), boatId: "boat-2", boatName: "Petrel", recipients: testBoat().recipients.slice(0, 1) };
    const digests = buildDigests([testBoat(), second], new Set(), "2026-10-19");
    expect(digests).toHaveLength(3);
    expect(digests[0].boats.map((b) => b.boatName)).toEqual(["Test boat", "Petrel"]);
    expect(digestSubject(digests[0])).toBe("2 overdue on your boats");
    expect(digestSubject(digests[1])).toBe("Test boat: 1 overdue");
  });

  it("sends nothing when nothing is due", () => {
    expect(buildDigests([testBoat()], new Set(), "2026-09-01")).toEqual([]);
  });
});

describe("renderDigest", () => {
  const digest = buildDigests([testBoat()], new Set(), "2026-12-01")[0];

  it("says what is due, what the date comes from, where the record came from, and when this was worked out", () => {
    const { subject, text, html } = renderDigest(digest, "https://heynewton.app/");
    expect(subject).toMatch(/^Test boat: \d+ overdue, \d+ coming up$/);
    expect(text).toContain("Hi Alex Sample,");
    expect(text).toContain("- State vessel registration (renewal) - Coming up\n  Expires 31 Dec 2026.\n  Reference XX 0000 ZZ.\n  From registration.pdf.");
    expect(text).toContain(`Open Test boat: https://heynewton.app/boats/${fixture.boat.id}`);
    expect(text).toContain("Worked out on 1 Dec 2026 from the records on Newton.");
    expect(html).toContain(`<a href="https://heynewton.app/boats/${fixture.boat.id}">Open Test boat</a>`);
  });

  it("escapes names in HTML", () => {
    const tricky: Digest = { ...digest, recipient: { ...digest.recipient, name: "<b>Al & Co</b>" } };
    const { html } = renderDigest(tricky, "https://heynewton.app");
    expect(html).toContain("Hi &lt;b&gt;Al &amp; Co&lt;/b&gt;,");
    expect(html).not.toContain("<b>Al");
  });
});

describe("runReminders", () => {
  class MemoryStore implements ReminderStore {
    sent = new Set<string>();
    async loadBoats() {
      return [testBoat()];
    }
    async loadSent() {
      return new Set(this.sent);
    }
    async recordSent(digest: Digest) {
      for (const boat of digest.boats) for (const item of boat.items) this.sent.add(sentKey(digest.recipient.personId, item));
    }
  }
  class FakeMailer implements Mailer {
    sent: { to: string; subject: string; key: string }[] = [];
    failFor = new Set<string>();
    async send(to: string, email: { subject: string }, key: string) {
      if (this.failFor.has(to)) throw new Error("provider down");
      this.sent.push({ to, subject: email.subject, key });
    }
  }

  it("sends each digest once and records it; running again the same day sends nothing", async () => {
    const store = new MemoryStore();
    const mailer = new FakeMailer();
    const deps = { store, mailer, today: "2026-10-19", siteUrl: "https://heynewton.app" };
    expect(await runReminders(deps)).toEqual({ digests: 3, sent: 3, failed: [] });
    expect(mailer.sent.map((s) => s.to)).toEqual(["alex@example.com", "sam@example.net", "jordan@example.com"]);
    expect(mailer.sent[0]).toEqual({ to: "alex@example.com", subject: "Test boat: 1 overdue", key: `reminders/${ALEX}/2026-10-19` });

    expect(await runReminders(deps)).toEqual({ digests: 0, sent: 0, failed: [] });
    expect(mailer.sent).toHaveLength(3);
  });

  it("carries on when one send fails, and retries that person on the next run", async () => {
    const store = new MemoryStore();
    const mailer = new FakeMailer();
    mailer.failFor.add("sam@example.net");
    const deps = { store, mailer, today: "2026-10-19", siteUrl: "https://heynewton.app" };
    const first = await runReminders(deps);
    expect(first.sent).toBe(2);
    expect(first.failed).toEqual([{ personId: "00000000-0000-4000-8000-000000000102", error: "provider down" }]);

    mailer.failFor.clear();
    expect(await runReminders({ ...deps, today: "2026-10-20" })).toMatchObject({ digests: 1, sent: 1 });
    expect(mailer.sent.at(-1)?.to).toBe("sam@example.net");
  });
});
