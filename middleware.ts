import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Para desarrollo, permitir acceso a todas las rutas sin verificación
  // Esto evita problemas de hidratación
  console.log("🛣️ Middleware - Permitiendo acceso a:", request.nextUrl.pathname)
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Excluir archivos estáticos y API routes
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
