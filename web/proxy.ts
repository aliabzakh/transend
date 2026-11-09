import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin pages are protected by one password from the environment (ADMIN_PASSWORD),
 * sent as HTTP Basic auth (any user name). With no password set, admin is open on a
 * local dev server and closed in production.
 */
export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Admin is not configured.", { status: 503 });
    }
    return NextResponse.next();
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (given === password) return NextResponse.next();
    } catch {
      /* fall through to the challenge */
    }
  }
  return new NextResponse("Admin password needed.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Transend admin"' },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
