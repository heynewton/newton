import type { Email } from "./index";
import type { Mailer } from "./run";

// Sends through Resend's API (docs/decisions/0003-email-provider.md), from the same address as
// sign-in mail.
export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from = "Hey Newton <noreply@heynewton.app>",
    private readonly baseUrl = "https://api.resend.com",
  ) {}

  async send(to: string, email: Email, idempotencyKey: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ from: this.from, to: [to], subject: email.subject, text: email.text, html: email.html }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Resend /emails: ${response.status} ${await response.text()}`);
  }
}
