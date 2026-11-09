import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { demoMode } from './lib/demo-mode'

export async function middleware(request) {
  const pathname = request.nextUrl.pathname
  if (demoMode) {
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'This endpoint requires a connected backend.' }, { status: 503 })
    }
    if (pathname === '/sign-in' || pathname === '/sign-up') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (!['/dashboard', '/profile', '/settings'].some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const supabaseResponse = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()


  const protectedRoutes = ['/dashboard', '/profile', '/settings']
  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (!session && isProtected) {
    const redirectUrl = new URL('/sign-in', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}


export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/settings/:path*', '/auditee/:path*', '/sign-in', '/sign-up', '/api/:path*'],
}
