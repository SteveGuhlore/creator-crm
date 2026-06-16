import { describe, it, expect } from 'vitest';
import { roleSatisfies } from './roles';
import { Role } from '@/lib/db';

describe('roleSatisfies (RBAC hierarchy)', () => {
  it('OWNER satisfies every role requirement', () => {
    expect(roleSatisfies(Role.OWNER, Role.OWNER)).toBe(true);
    expect(roleSatisfies(Role.OWNER, Role.MANAGER)).toBe(true);
    expect(roleSatisfies(Role.OWNER, Role.OPERATOR)).toBe(true);
  });

  it('MANAGER satisfies MANAGER/OPERATOR but not OWNER', () => {
    expect(roleSatisfies(Role.MANAGER, Role.OWNER)).toBe(false);
    expect(roleSatisfies(Role.MANAGER, Role.MANAGER)).toBe(true);
    expect(roleSatisfies(Role.MANAGER, Role.OPERATOR)).toBe(true);
  });

  it('OPERATOR satisfies only OPERATOR', () => {
    expect(roleSatisfies(Role.OPERATOR, Role.OWNER)).toBe(false);
    expect(roleSatisfies(Role.OPERATOR, Role.MANAGER)).toBe(false);
    expect(roleSatisfies(Role.OPERATOR, Role.OPERATOR)).toBe(true);
  });
});
