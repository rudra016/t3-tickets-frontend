// Route gate: presence check on a UI marker cookie set by lib/api.ts after
// a successful login. We *can't* check the real HttpOnly session cookie here
// because in prod the frontend and backend live on different origins (Vercel
// vs Railway) and the session cookie is scoped to the backend origin — this
// middleware runs on the frontend origin and can't see it.
//
// That's fine: the backend re-validates the real session on every API call,
// so a forged marker only gets someone into the empty app shell; every data
// fetch will 401 and lib/api.ts bounces them back to /login.
//
// In Next 16 this file replaces the old `middleware.ts` convention.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "t3_logged_in";

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
