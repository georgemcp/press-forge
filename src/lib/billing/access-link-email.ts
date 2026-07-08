export type AccessLinkOrder = {
  stripe_session_id: string;
  entitlement: string;
  status: string;
  customer_email: string | null;
  created_at: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildAccessLinkEmail(email: string, order: AccessLinkOrder, accessUrl: string) {
  const label = order.entitlement === "subscription" ? "Trim Proof Pro subscription" : "Trim Proof export credit";
  const safeAccessUrl = escapeHtml(accessUrl);
  const safeEmail = escapeHtml(email);
  const text = [
    `Your ${label} access link is ready.`,
    "",
    "Open this link to unlock advanced PDF/X export mode:",
    accessUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "Trim Proof"
  ].join("\n");

  return {
    to: email,
    subject: "Your Trim Proof access link",
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h1 style="font-size:22px;margin:0 0 12px">Your ${escapeHtml(label)} access link is ready.</h1>
        <p>Open this link to unlock advanced PDF/X export mode:</p>
        <p><a href="${safeAccessUrl}">Open Trim Proof advanced mode</a></p>
        <p style="font-size:13px;color:#6b7280">Billing email: ${safeEmail}</p>
        <p>If you did not request this, you can ignore this email.</p>
        <p>Trim Proof</p>
      </div>
    `
  };
}
