import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';

// Edge middleware uses the lightweight config (no Prisma/bcrypt) to gate routes.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except static assets and the auth API.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
