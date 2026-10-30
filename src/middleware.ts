import { NextResponse, type NextRequest } from "next/server";

const accountSessionCookie = "trimproof_account";

function configuredOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (!configured) {
    return undefined;
  }
  try {
    const url = new URL(configured);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

function signupUrl(request: NextRequest) {
  // request.url is built from the Host header, which a misrouted reverse-proxy
  // request can forge. Use the configured origin and fall back to the request
  // origin only outside production.
  const origin = configuredOrigin()
    ?? (process.env.NODE_ENV === "production" ? undefined : request.nextUrl.origin);
  if (!origin) {
    return undefined;
  }

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const url = new URL("/signup", origin);
  url.searchParams.set("next", nextPath);
  return url;
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/app" && !request.cookies.get(accountSessionCookie)?.value) {
    const url = signupUrl(request);
    if (!url) {
      console.error("Trim Proof app redirect is unavailable: NEXT_PUBLIC_APP_URL or APP_URL is not a valid absolute origin");
      return new NextResponse("Service unavailable", { status: 503 });
    }
    const response = NextResponse.redirect(url);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app"]
};
