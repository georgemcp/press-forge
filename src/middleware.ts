import { NextResponse, type NextRequest } from "next/server";

const accountSessionCookie = "trimproof_account";

function signupUrl(request: NextRequest) {
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const url = new URL("/signup", request.url);
  url.searchParams.set("next", nextPath);
  return url;
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/app" && !request.cookies.get(accountSessionCookie)?.value) {
    const response = NextResponse.redirect(signupUrl(request));
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app"]
};
