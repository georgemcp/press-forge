export const DEFAULT_SITE_ORIGIN = "https://trimproof.com";

const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

export function getSiteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredOrigin) {
    return DEFAULT_SITE_ORIGIN;
  }

  try {
    const parsedOrigin = new URL(configuredOrigin);
    if (localHostnames.has(parsedOrigin.hostname)) {
      return DEFAULT_SITE_ORIGIN;
    }

    return parsedOrigin.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function getSiteUrl() {
  return new URL(getSiteOrigin());
}
