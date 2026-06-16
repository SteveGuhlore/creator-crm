import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { authConfig } from './config';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Full Node-runtime auth instance (uses Prisma + bcrypt in authorize()).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await writeAudit({
          actorUserId: user.id,
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          metadata: { email: user.email },
        });

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
});
