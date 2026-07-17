const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export function safeInternalPath(value: unknown, fallback = "/app") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (value.includes("\\") || decoded.includes("\\") || controlCharacterPattern.test(value) || controlCharacterPattern.test(decoded)) {
    return fallback;
  }

  try {
    const base = new URL("https://internal.trimproof.invalid");
    const parsed = new URL(value, base);
    return parsed.origin === base.origin && parsed.pathname.startsWith("/")
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
