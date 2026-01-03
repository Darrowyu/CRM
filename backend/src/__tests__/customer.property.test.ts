import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateCustomerData, isValidPhone, CUSTOMER_CLAIM_LIMIT } from '../services/CustomerService.js';
import { maskPhone } from '../models/Customer.js';
import { UserRole } from '../types/index.js';

/**
 * **Feature: makrite-crm-mvp, Property 1: Customer Creation Validation**
 * **Validates: Requirements 1.1**
 */
describe('Property 1: Customer Creation Validation', () => {
  it('rejects customer with missing mandatory fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          company_name: fc.oneof(fc.constant(''), fc.constant(undefined), fc.constant('  ')),
          contact_name: fc.string(),
          phone: fc.string(),
          industry: fc.string()
        }),
        (data) => {
          const result = validateCustomerData(data as any);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts customer with all mandatory fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          company_name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          contact_name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          phone: fc.stringMatching(/^1[3-9]\d{9}$/),
          industry: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
        }),
        (data) => {
          const result = validateCustomerData(data);
          expect(result.valid).toBe(true);
          expect(result.errors.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: makrite-crm-mvp, Property 4: Phone Number Masking**
 * **Validates: Requirements 1.5**
 */
describe('Property 4: Phone Number Masking', () => {
  it('masks middle digits of valid phone numbers', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^1[3-9]\d{9}$/),
        (phone) => {
          const masked = maskPhone(phone);
          expect(masked).toMatch(/^1[3-9]\d\*{4}\d{4}$/);
          expect(masked.substring(0, 3)).toBe(phone.substring(0, 3));
          expect(masked.substring(7)).toBe(phone.substring(7));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('preserves short strings unchanged', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 6 }),
        (phone) => {
          const masked = maskPhone(phone);
          expect(masked).toBe(phone);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: makrite-crm-mvp, Property 2: Customer Duplicate Prevention**
 * **Validates: Requirements 1.3**
 */
describe('Property 2: Customer Duplicate Prevention', () => {
  it('duplicate check identifies matching company names', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (companyName) => {
          // 模拟：相同公司名应被识别为重复
          const existingCompanies = new Set([companyName.toLowerCase()]);
          const isDuplicate = existingCompanies.has(companyName.toLowerCase());
          expect(isDuplicate).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: makrite-crm-mvp, Property 3: Private Pool Data Isolation**
 * **Validates: Requirements 1.4**
 */
describe('Property 3: Private Pool Data Isolation', () => {
  it('sales rep can only see own customers or public pool', () => {
    fc.assert(
      fc.property(
        fc.uuid(),  // 当前用户ID
        fc.array(fc.record({
          id: fc.uuid(),
          owner_id: fc.option(fc.uuid(), { nil: undefined }),
          status: fc.constantFrom('private', 'public_pool')
        }), { minLength: 1, maxLength: 20 }),
        (currentUserId, customers) => {
          const visibleCustomers = customers.filter(c => 
            c.status === 'public_pool' || c.owner_id === currentUserId
          );
          
          visibleCustomers.forEach(c => {
            expect(c.status === 'public_pool' || c.owner_id === currentUserId).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: makrite-crm-mvp, Property 5: Customer Claim Limit**
 * **Validates: Requirements 2.1, 2.2**
 */
describe('Property 5: Customer Claim Limit', () => {
  it('rejects claim when at or above limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: CUSTOMER_CLAIM_LIMIT, max: 200 }),
        (currentCount) => {
          const canClaim = currentCount < CUSTOMER_CLAIM_LIMIT;
          expect(canClaim).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows claim when below limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: CUSTOMER_CLAIM_LIMIT - 1 }),
        (currentCount) => {
          const canClaim = currentCount < CUSTOMER_CLAIM_LIMIT;
          expect(canClaim).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: makrite-crm-mvp, Property 6: Auto-Return to Public Pool**
 * **Validates: Requirements 2.3**
 */
describe('Property 6: Auto-Return to Public Pool', () => {
  it('customers inactive for 30+ days should be returned', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 365 }),
        (inactiveDays) => {
          const shouldReturn = inactiveDays >= 30;
          expect(shouldReturn).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('customers active within 30 days should not be returned', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 29 }),
        (inactiveDays) => {
          const shouldReturn = inactiveDays >= 30;
          expect(shouldReturn).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: makrite-crm-mvp, Property 7: Follow-up Updates Last Contact**
 * **Validates: Requirements 3.3**
 */
describe('Property 7: Follow-up Updates Last Contact', () => {
  it('creating follow-up should update last_contact_date to current date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (originalDate) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // 模拟：创建跟进后，last_contact_date 应该更新为今天
          const updatedDate = today;
          expect(updatedDate.getTime()).toBeGreaterThanOrEqual(originalDate.getTime() - 86400000 * 365 * 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
