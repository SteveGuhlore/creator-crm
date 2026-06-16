import { Role } from '@/lib/db';
import { auth } from './index';
import { AuthError, roleSatisfies, type SessionUser } from './roles';

export { AuthError, roleSatisfies };
export type { SessionUser };

/** Returns the current session user, or null when unauthenticated. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role: (session.user.role as Role) ?? Role.OWNER,
  };
}

/** Throws AuthError(401) when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('Authentication required', 401);
  return user;
}

/**
 * Server-side RBAC gate. Throws AuthError(401/403) when the requirement is not
 * met. Enforced on the server, never merely hidden in the UI.
 */
export async function requireRole(required: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!roleSatisfies(user.role, required)) {
    throw new AuthError(`Requires ${required} role (have ${user.role})`, 403);
  }
  return user;
}
