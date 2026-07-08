export interface AnalyticsAttribution {
  gaClientId?: string;
  gaSessionId?: string;
  pagePath?: string;
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return undefined;
  }
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function parseGaClientId(cookieValue?: string) {
  if (!cookieValue) {
    return undefined;
  }
  const decoded = decodeURIComponent(cookieValue);
  const parts = decoded.split(".");
  if (parts.length < 4) {
    return undefined;
  }
  return `${parts.at(-2)}.${parts.at(-1)}`;
}

function parseGaSessionId(cookieValue?: string) {
  if (!cookieValue) {
    return undefined;
  }
  const decoded = decodeURIComponent(cookieValue);
  const oldFormat = decoded.match(/^GS\d+\.\d+\.(\d+)\./);
  if (oldFormat?.[1]) {
    return oldFormat[1];
  }
  const newFormat = decoded.match(/[.$]s(\d+)/);
  return newFormat?.[1];
}

export function getAnalyticsAttribution(): AnalyticsAttribution | undefined {
  const gaClientId = parseGaClientId(getCookieValue("_ga"));
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.replace(/^G-/, "");
  const gaSessionId = measurementId ? parseGaSessionId(getCookieValue(`_ga_${measurementId}`)) : undefined;
  const pagePath = typeof window === "undefined" ? undefined : `${window.location.pathname}${window.location.search}`;

  if (!gaClientId && !gaSessionId && !pagePath) {
    return undefined;
  }

  return {
    gaClientId,
    gaSessionId,
    pagePath
  };
}
