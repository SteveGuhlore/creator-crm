import { Role } from '@/lib/db';

// Pure RBAC primitives — NO NextAuth import, so they are unit-testable and
// safe to use anywhere (including the edge runtime).

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}

// Role hierarchy: OWNER ⊇ MANAGER ⊇ OPERATOR.
const ROLE_RANK: Record<Role, number> = {
  [Role.OPERATOR]: 1,
  [Role.MANAGER]: 2,
  [Role.OWNER]: 3,
};

export function roleSatisfies(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
