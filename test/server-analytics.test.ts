import { afterEach, describe, expect, it, vi } from "vitest";
import { isServerAnalyticsConfigured, sendServerAnalyticsEvent } from "@/lib/analytics/server-events";

function clearAnalyticsEnv() {
  vi.stubEnv("GA4_MEASUREMENT_ID", "");
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
  vi.stubEnv("GA4_API_SECRET", "");
  vi.stubEnv("GA4_MEASUREMENT_PROTOCOL_API_SECRET", "");
  vi.stubEnv("GOOGLE_ANALYTICS_API_SECRET", "");
}

describe("server analytics events", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips events when GA4 Measurement Protocol is not configured", async () => {
    clearAnalyticsEnv();
    const fetchFn = vi.fn() as unknown as typeof fetch;

    const result = await sendServerAnalyticsEvent({ name: "purchase", clientId: "123.456" }, fetchFn);

    expect(result).toMatchObject({
      status: "skipped",
      configured: false
    });
    expect(isServerAnalyticsConfigured()).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("skips configured events when the GA client ID is missing", async () => {
    clearAnalyticsEnv();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("GA4_API_SECRET", "test-secret");
    const fetchFn = vi.fn() as unknown as typeof fetch;

    const result = await sendServerAnalyticsEvent({ name: "purchase" }, fetchFn);

    expect(result).toMatchObject({
      status: "skipped",
      configured: true,
      reason: "GA client ID is missing."
    });
    expect(isServerAnalyticsConfigured()).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends sanitized Measurement Protocol payloads", async () => {
    clearAnalyticsEnv();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("GA4_API_SECRET", "test-secret");
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const result = await sendServerAnalyticsEvent(
      {
        name: "purchase",
        clientId: "123.456",
        params: {
          transaction_id: "cs_test",
          currency: "USD",
          value: 9,
          "bad-param": "removed",
          items: [
            {
              item_id: "trimproof_export_credit",
              item_name: "Trim Proof Export Credit",
              price: 9,
              quantity: 1
            }
          ]
        }
      },
      fetchFn
    );

    expect(result).toMatchObject({
      status: "sent",
      configured: true
    });
    const [url, init] = vi.mocked(fetchFn).mock.calls[0];
    expect(String(url)).toContain("https://www.google-analytics.com/mp/collect");
    expect(String(url)).toContain("measurement_id=G-TEST123");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      client_id: "123.456",
      events: [
        {
          name: "purchase",
          params: {
            engagement_time_msec: 1,
            transaction_id: "cs_test",
            currency: "USD",
            value: 9,
            items: [
              {
                item_id: "trimproof_export_credit",
                item_name: "Trim Proof Export Credit",
                price: 9,
                quantity: 1
              }
            ]
          }
        }
      ]
    });
    expect(JSON.parse(String(init?.body)).events[0].params["bad-param"]).toBeUndefined();
  });

  it("accepts GA4_MEASUREMENT_PROTOCOL_API_SECRET as an api secret alias", async () => {
    clearAnalyticsEnv();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("GA4_MEASUREMENT_PROTOCOL_API_SECRET", "test-secret");
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    const result = await sendServerAnalyticsEvent({ name: "proof_export_completed", clientId: "123.456" }, fetchFn);

    expect(result).toMatchObject({
      status: "sent",
      configured: true
    });
    expect(String(vi.mocked(fetchFn).mock.calls[0][0])).toContain("api_secret=test-secret");
  });

  it("reports failed HTTP responses", async () => {
    clearAnalyticsEnv();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("GA4_API_SECRET", "test-secret");
    const fetchFn = vi.fn(async () => new Response(null, { status: 500 })) as unknown as typeof fetch;

    const result = await sendServerAnalyticsEvent({ name: "purchase", clientId: "123.456" }, fetchFn);

    expect(result).toMatchObject({
      status: "failed",
      configured: true,
      reason: "GA4 Measurement Protocol returned HTTP 500."
    });
  });
});
