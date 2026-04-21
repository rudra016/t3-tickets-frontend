// Route gate: cookie presence check. Anything under `matcher` requires the
// session cookie; anything else (including /login and static assets) passes
// through. The backend is the real authority — it verifies every API call —
// so a forged or expired cookie here only grants access to the SHELL, not to
// any data.
//
// In Next 16 this file replaces the old `middleware.ts` convention.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "t3_session";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has(COOKIE_NAME);

  // If you're on /login and already authed, bounce to home.
  if (pathname === "/login" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Anywhere else without a session cookie: send to /login with `next`.
  if (!hasSession && pathname !== "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every app page except Next internals, static files, and the
  // favicon. /login is included so the already-authed redirect works.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)"],
};
