import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "@/lib/email/transactional";

function clearEmailEnv() {
  vi.stubEnv("EMAIL_PROVIDER", "");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("SENDGRID_API_KEY", "");
  vi.stubEnv("TRIMPROOF_EMAIL_FROM", "");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubEnv("RESEND_FROM_EMAIL", "");
  vi.stubEnv("SENDGRID_FROM_EMAIL", "");
  vi.stubEnv("TRIMPROOF_EMAIL_FROM_NAME", "");
  vi.stubEnv("EMAIL_FROM_NAME", "");
  vi.stubEnv("SENDGRID_FROM_NAME", "");
  vi.stubEnv("TRIMPROOF_EMAIL_REPLY_TO", "");
  vi.stubEnv("EMAIL_REPLY_TO", "");
  vi.stubEnv("SUPPORT_EMAIL", "");
}

describe("transactional email", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips sending when no email provider is configured", async () => {
    clearEmailEnv();
    const fetchFn = vi.fn() as unknown as typeof fetch;

    const result = await sendTransactionalEmail(
      {
        to: "buyer@example.com",
        subject: "Welcome",
        text: "Welcome",
        html: "<p>Welcome</p>"
      },
      fetchFn
    );

    expect(result).toMatchObject({
      status: "skipped",
      configured: false
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends Resend-compatible payloads", async () => {
    clearEmailEnv();
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("EMAIL_FROM", "launch@trimproof.com");
    vi.stubEnv("EMAIL_FROM_NAME", "Trim Proof");
    vi.stubEnv("EMAIL_REPLY_TO", "support@trimproof.com");
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: "em_test" }), { status: 200 })) as unknown as typeof fetch;

    const result = await sendTransactionalEmail(
      {
        to: "buyer@example.com",
        subject: "Welcome",
        text: "Welcome",
        html: "<p>Welcome</p>"
      },
      fetchFn
    );

    expect(result).toMatchObject({
      status: "sent",
      provider: "resend",
      messageId: "em_test"
    });
    const [url, init] = vi.mocked(fetchFn).mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-resend-key"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      from: "Trim Proof <launch@trimproof.com>",
      to: ["buyer@example.com"],
      subject: "Welcome",
      reply_to: "support@trimproof.com"
    });
  });

  it("sends SendGrid-compatible payloads", async () => {
    clearEmailEnv();
    vi.stubEnv("EMAIL_PROVIDER", "sendgrid");
    vi.stubEnv("SENDGRID_API_KEY", "test-sendgrid-key");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "launch@trimproof.com");
    vi.stubEnv("SENDGRID_FROM_NAME", "Trim Proof");
    const fetchFn = vi.fn(
      async () =>
        new Response(undefined, {
          status: 202,
          headers: {
            "x-message-id": "sg_test"
          }
        })
    ) as unknown as typeof fetch;

    const result = await sendTransactionalEmail(
      {
        to: ["buyer@example.com", "ops@example.com"],
        subject: "Welcome",
        text: "Welcome",
        html: "<p>Welcome</p>",
        replyTo: "support@trimproof.com"
      },
      fetchFn
    );

    expect(result).toMatchObject({
      status: "sent",
      provider: "sendgrid",
      messageId: "sg_test"
    });
    const [url, init] = vi.mocked(fetchFn).mock.calls[0];
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer test-sendgrid-key"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      personalizations: [
        {
          to: [{ email: "buyer@example.com" }, { email: "ops@example.com" }]
        }
      ],
      from: {
        email: "launch@trimproof.com",
        name: "Trim Proof"
      },
      reply_to: {
        email: "support@trimproof.com"
      },
      subject: "Welcome"
    });
  });
});
