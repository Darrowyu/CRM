import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { UserRole } from '../types/index.js';
import { canAccessResource, getRoleLevel, isAdmin, isManager } from '../middleware/authorize.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

/**
 * **Feature: makrite-crm-mvp, Property 15: Role-Based Access Control**
 * **Validates: Requirements 10.4**
 * 
 * *For any* API request, the system should verify the user's role 
 * and restrict access to authorized resources only.
 */

const allRoles = [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.SALES_REP];
const roleArb = fc.constantFrom(...allRoles);

describe('Property 15: Role-Based Access Control', () => {
  it('canAccessResource returns true only when role is in allowed list', () => {
    fc.assert(
      fc.property(
        roleArb,
        fc.subarray(allRoles, { minLength: 0 }),
        (userRole, allowedRoles) => {
          const result = canAccessResource(userRole, allowedRoles);
          expect(result).toBe(allowedRoles.includes(userRole));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('admin role has highest privilege level', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        if (role !== UserRole.ADMIN) {
          expect(getRoleLevel(UserRole.ADMIN)).toBeGreaterThan(getRoleLevel(role));
        }
      }),
      { numRuns: 100 }
    );
  });

  it('isAdmin returns true only for admin role', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        expect(isAdmin(role)).toBe(role === UserRole.ADMIN);
      }),
      { numRuns: 100 }
    );
  });

  it('isManager returns true only for admin and sales_manager', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        const expected = role === UserRole.ADMIN || role === UserRole.SALES_MANAGER;
        expect(isManager(role)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('JWT token round-trip preserves user role', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        roleArb,
        (userId, username, role) => {
          const payload = { userId, username, role };
          const token = generateToken(payload);
          const decoded = verifyToken(token);
          expect(decoded).not.toBeNull();
          expect(decoded!.role).toBe(role);
          expect(decoded!.userId).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
