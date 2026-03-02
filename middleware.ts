import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const sessionCookie = request.cookies.get('session')

  // Public routes (no auth required)
  // NOTE: Route group "(auth)" maps to "/login" and "/error" in the URL.
  const publicRoutes = ['/', '/login', '/error']
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // API routes for login/logout
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')) {
    return NextResponse.next()
  }

  // Protected routes - require authentication
  const isProtected = pathname.startsWith('/protected') || 
                     pathname.startsWith('/field-agent') || 
                     pathname.startsWith('/collection-manager')

  if (isProtected) {
    // Check if session exists
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      // Parse session data
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
      )

      // Role-based route protection
      if (pathname.startsWith('/collection-manager') && sessionData.role !== 'collection_manager') {
        return NextResponse.redirect(new URL('/protected', request.url))
      }

      if (pathname.startsWith('/field-agent') && sessionData.role !== 'field_agent') {
        return NextResponse.redirect(new URL('/protected', request.url))
      }
    } catch (error) {
      // Invalid session, redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/.*|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
