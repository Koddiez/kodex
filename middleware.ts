import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')

  if (!token && !isAuthPage && req.nextUrl.pathname.startsWith('/dashboard')) {
    const signInUrl = new URL('/auth/signin', req.url)
    return NextResponse.redirect(signInUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
} 