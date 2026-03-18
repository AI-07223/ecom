import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to protect admin routes server-side.
 * Reads the __session HttpOnly cookie set by /api/auth/session.
 * If the user is not an admin, redirects to /profile.
 * If there's no session at all, redirects to /login.
 */
export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("__session")?.value;

  if (!sessionCookie) {
    // No session - redirect to login with return URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = JSON.parse(sessionCookie);

    if (session.role !== "admin") {
      // Authenticated but not admin - redirect to profile
      return NextResponse.redirect(new URL("/profile", request.url));
    }

    // Admin - allow through
    return NextResponse.next();
  } catch {
    // Invalid cookie - redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/profile/admin/:path*"],
};
