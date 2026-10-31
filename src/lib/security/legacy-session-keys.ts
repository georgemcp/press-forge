/**
 * Hard sunset for session cookies signed with a legacy raw secret.
 *
 * Before signing keys were domain-separated, account and admin session tokens
 * were signed with a raw shared secret. Legacy tokens are still accepted for
 * verification so a deploy does not sign everyone out, but only until this
 * instant. The longest TTL among the affected tokens is the account session's
 * 7 days (admin sessions live 8 hours), so the cutoff is 2026-10-31 + 7 days,
 * written as 2026-11-07T00:00:00Z. After it, legacy keys are skipped
 * entirely; they are never used to sign.
 */
export const LEGACY_SESSION_KEYS_UNTIL = Date.parse("2026-11-07T00:00:00.000Z");
