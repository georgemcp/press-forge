type EmailProvider = "resend" | "sendgrid";
type EmailStatus = "sent" | "skipped" | "failed";

export interface EmailConfig {
  provider: EmailProvider;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

export interface EmailSendResult {
  status: EmailStatus;
  configured: boolean;
  provider?: EmailProvider;
  messageId?: string;
  reason?: string;
}

export interface TransactionalEmail {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

type FetchLike = typeof fetch;

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

function resolveProvider(): EmailProvider | undefined {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider === "resend" || provider === "sendgrid") {
    return provider;
  }
  if (process.env.RESEND_API_KEY) {
    return "resend";
  }
  if (process.env.SENDGRID_API_KEY) {
    return "sendgrid";
  }
  return undefined;
}

export function resolveEmailConfig(): EmailConfig | undefined {
  const provider = resolveProvider();
  if (!provider) {
    return undefined;
  }

  const apiKey = provider === "resend" ? process.env.RESEND_API_KEY : process.env.SENDGRID_API_KEY;
  const fromEmail = firstValue(
    process.env.TRIMPROOF_EMAIL_FROM,
    process.env.EMAIL_FROM,
    process.env.RESEND_FROM_EMAIL,
    process.env.SENDGRID_FROM_EMAIL
  );

  if (!apiKey || !fromEmail) {
    return undefined;
  }

  return {
    provider,
    apiKey,
    fromEmail,
    fromName: firstValue(process.env.TRIMPROOF_EMAIL_FROM_NAME, process.env.EMAIL_FROM_NAME, process.env.SENDGRID_FROM_NAME) ?? "Trim Proof",
    replyTo: firstValue(process.env.TRIMPROOF_EMAIL_REPLY_TO, process.env.EMAIL_REPLY_TO, process.env.SUPPORT_EMAIL)
  };
}

function recipients(to: string | string[]) {
  return Array.isArray(to) ? to : [to];
}

async function sendWithResend(config: EmailConfig, email: TransactionalEmail, fetchFn: FetchLike): Promise<EmailSendResult> {
  const response = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: recipients(email.to),
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: email.replyTo ?? config.replyTo
    })
  });

  const payload = (await response.json().catch(() => undefined)) as { id?: string; message?: string } | undefined;
  if (!response.ok) {
    return {
      status: "failed",
      configured: true,
      provider: "resend",
      reason: payload?.message ?? `Resend returned HTTP ${response.status}.`
    };
  }

  return {
    status: "sent",
    configured: true,
    provider: "resend",
    messageId: payload?.id
  };
}

async function sendWithSendGrid(config: EmailConfig, email: TransactionalEmail, fetchFn: FetchLike): Promise<EmailSendResult> {
  const replyTo = email.replyTo ?? config.replyTo;
  const response = await fetchFn("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: recipients(email.to).map((recipient) => ({ email: recipient }))
        }
      ],
      from: {
        email: config.fromEmail,
        name: config.fromName
      },
      reply_to: replyTo ? { email: replyTo } : undefined,
      subject: email.subject,
      content: [
        {
          type: "text/plain",
          value: email.text
        },
        {
          type: "text/html",
          value: email.html
        }
      ]
    })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as { errors?: Array<{ message?: string }> } | undefined;
    return {
      status: "failed",
      configured: true,
      provider: "sendgrid",
      reason: payload?.errors?.[0]?.message ?? `SendGrid returned HTTP ${response.status}.`
    };
  }

  return {
    status: "sent",
    configured: true,
    provider: "sendgrid",
    messageId: response.headers.get("x-message-id") ?? undefined
  };
}

export async function sendTransactionalEmail(email: TransactionalEmail, fetchFn: FetchLike = fetch): Promise<EmailSendResult> {
  const config = resolveEmailConfig();
  if (!config) {
    return {
      status: "skipped",
      configured: false,
      reason: "Transactional email provider is not configured."
    };
  }

  try {
    if (config.provider === "resend") {
      return await sendWithResend(config, email, fetchFn);
    }
    return await sendWithSendGrid(config, email, fetchFn);
  } catch (error) {
    return {
      status: "failed",
      configured: true,
      provider: config.provider,
      reason: error instanceof Error ? error.message : "Transactional email request failed."
    };
  }
}

export function getAdminSignupRecipients() {
  return firstValue(process.env.TRIMPROOF_ADMIN_EMAIL, process.env.EMAIL_ADMIN_TO, process.env.ADMIN_SUPPORT_EMAIL)
    ?.split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}
