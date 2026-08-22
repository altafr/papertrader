import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY &&
    process.env.CLERK_OPERATOR_USER_ID &&
    process.env.CLERK_AUTHORIZED_PARTIES,
);

const configuredMiddleware = clerkMiddleware();

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (clerkConfigured) {
    return configuredMiddleware(request, event);
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/sign-in")) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in/:path*", "/__clerk/:path*"],
};
