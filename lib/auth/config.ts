import type { NextAuthConfig } from 'next-auth';

// Edge-safe auth config (no Prisma / bcrypt here) — shared by middleware and
// the full Node-runtime auth instance. Providers are attached in ./index.ts.
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    // Gate the dashboard: only authenticated users may enter /dashboard.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // role is attached by the credentials authorize() callback.
        token.role = (user as { role?: string }).role ?? 'OWNER';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as string) ?? 'OWNER';
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
