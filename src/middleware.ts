import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/api/auth", "/api/webhooks", "/api/unsubscribe", "/api/track", "/api/inngest"];

function isPublicPath(pathname: string) {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(request: NextRequest) {
  // We need to track cookies set by Supabase so we can forward them on redirects
  const cookiesToForward: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Track all cookies Supabase wants to set
          cookiesToForward.push(...cookiesToSet);
        },
      },
    }
  );

  const { pathname, searchParams } = request.nextUrl;

  // Handle OAuth callback code — exchange it for a session
  const code = searchParams.get("code");
  if (code && (pathname === "/" || pathname === "/api/auth/callback")) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      const response = NextResponse.redirect(url);
      // Forward the session cookies onto the redirect response
      cookiesToForward.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options as Record<string, string>)
      );
      return response;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users to dashboard from landing/auth pages
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const response = NextResponse.redirect(url);
    cookiesToForward.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options as Record<string, string>)
    );
    return response;
  }

  // Protect dashboard and onboarding routes
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Default: pass through with cookies
  const response = NextResponse.next({ request });
  cookiesToForward.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options as Record<string, string>)
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
