import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";

/** Checagem otimista: quem não tem sessão vai para /login. */
export async function proxy(request: NextRequest) {
  const ok = await isValidSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!ok) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tudo, exceto login, webhook do Telegram e arquivos estáticos.
  matcher: ["/((?!login|api/telegram|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
