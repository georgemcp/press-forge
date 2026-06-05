type EventParam = string | number | boolean | undefined | null | Array<Record<string, string | number>>;

export interface ServerAnalyticsEvent {
  name: string;
  clientId?: string | null;
  userId?: string | null;
  params?: Record<string, EventParam>;
}

export interface ServerAnalyticsResult {
  status: "sent" | "skipped" | "failed";
  configured: boolean;
  provider: "ga4_measurement_protocol";
  reason?: string;
}

type FetchLike = typeof fetch;

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

export function isServerAnalyticsConfigured() {
  return Boolean(resolveGa4Config());
}

function resolveGa4Config() {
  const measurementId = firstValue(process.env.GA4_MEASUREMENT_ID, process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  const apiSecret = firstValue(process.env.GA4_API_SECRET, process.env.GOOGLE_ANALYTICS_API_SECRET);
  if (!measurementId || !apiSecret) {
    return undefined;
  }
  return {
    measurementId,
    apiSecret
  };
}

function sanitizeParamValue(value: EventParam): EventParam {
  if (typeof value === "string") {
    return value.slice(0, 100);
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      Object.fromEntries(
        Object.entries(item)
          .filter(([, itemValue]) => typeof itemValue === "string" || typeof itemValue === "number")
          .map(([itemKey, itemValue]) => [itemKey.slice(0, 40), typeof itemValue === "string" ? itemValue.slice(0, 100) : itemValue])
      )
    );
  }
  return value;
}

function sanitizeParams(params: Record<string, EventParam> = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([key, value]) => /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key) && value !== undefined && value !== null)
      .slice(0, 25)
      .map(([key, value]) => [key, sanitizeParamValue(value)])
  );
}

export async function sendServerAnalyticsEvent(event: ServerAnalyticsEvent, fetchFn: FetchLike = fetch): Promise<ServerAnalyticsResult> {
  const config = resolveGa4Config();
  if (!config) {
    return {
      status: "skipped",
      configured: false,
      provider: "ga4_measurement_protocol",
      reason: "GA4 Measurement Protocol is not configured."
    };
  }

  const clientId = event.clientId?.trim();
  if (!clientId) {
    return {
      status: "skipped",
      configured: true,
      provider: "ga4_measurement_protocol",
      reason: "GA client ID is missing."
    };
  }

  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", config.measurementId);
  endpoint.searchParams.set("api_secret", config.apiSecret);

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      user_id: event.userId?.trim() || undefined,
      events: [
        {
          name: event.name.slice(0, 40),
          params: sanitizeParams({
            engagement_time_msec: 1,
            ...event.params
          })
        }
      ]
    })
  });

  if (!response.ok) {
    return {
      status: "failed",
      configured: true,
      provider: "ga4_measurement_protocol",
      reason: `GA4 Measurement Protocol returned HTTP ${response.status}.`
    };
  }

  return {
    status: "sent",
    configured: true,
    provider: "ga4_measurement_protocol"
  };
}
