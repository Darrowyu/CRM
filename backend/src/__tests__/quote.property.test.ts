import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateTieredPrice, PricingTier } from '../models/Product.js';
import { requiresApproval, isManualPrice } from '../models/Quote.js';

/**
 * **Feature: makrite-crm-mvp, Property 10: Tiered Pricing Calculation**
 * **Validates: Requirements 5.1, 5.2**
 */
describe('Property 10: Tiered Pricing Calculation', () => {
  it('returns correct tier price based on quantity', () => {
    const tiers: PricingTier[] = [
      { id: '1', product_id: 'p1', min_quantity: 1, unit_price: 100, created_at: new Date() },
      { id: '2', product_id: 'p1', min_quantity: 10000, unit_price: 90, created_at: new Date() },
      { id: '3', product_id: 'p1', min_quantity: 100000, unit_price: 80, created_at: new Date() },
      { id: '4', product_id: 'p1', min_quantity: 1000000, unit_price: 70, created_at: new Date() }
    ];

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2000000 }), (quantity) => {
        const price = calculateTieredPrice(tiers, quantity);
        
        if (quantity >= 1000000) expect(price).toBe(70);
        else if (quantity >= 100000) expect(price).toBe(80);
        else if (quantity >= 10000) expect(price).toBe(90);
        else expect(price).toBe(100);
      }),
      { numRuns: 100 }
    );
  });

  it('higher quantity gets lower or equal price', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.uuid(),
          product_id: fc.uuid(),
          min_quantity: fc.integer({ min: 1, max: 1000000 }),
          unit_price: fc.float({ min: 1, max: 1000 }),
          created_at: fc.date()
        }), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 500000 }),
        fc.integer({ min: 1, max: 500000 }),
        (tiers, q1, q2) => {
          // 确保tiers按min_quantity排序且价格递减
          const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
          for (let i = 1; i < sortedTiers.length; i++) {
            sortedTiers[i].unit_price = Math.min(sortedTiers[i].unit_price, sortedTiers[i-1].unit_price);
          }
          
          const price1 = calculateTieredPrice(sortedTiers, Math.min(q1, q2));
          const price2 = calculateTieredPrice(sortedTiers, Math.max(q1, q2));
          expect(price2).toBeLessThanOrEqual(price1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: makrite-crm-mvp, Property 11: Manual Price Flag**
 * **Validates: Requirements 5.3**
 */
describe('Property 11: Manual Price Flag', () => {
  it('flags price as manual when different from calculated', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        (calculatedPrice, diff) => {
          const manualPrice = calculatedPrice + diff;
          expect(isManualPrice(manualPrice, calculatedPrice)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not flag when price matches calculated', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (price) => {
        expect(isManualPrice(price, price)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: makrite-crm-mvp, Property 12: Approval Workflow Trigger**
 * **Validates: Requirements 6.1**
 */
describe('Property 12: Approval Workflow Trigger', () => {
  it('requires approval when price is below floor price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 1000 }),
        fc.integer({ min: 1, max: 9 }),
        (floorPrice, reduction) => {
          const unitPrice = floorPrice - reduction;
          expect(requiresApproval(unitPrice, floorPrice)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not require approval when price is at or above floor', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 1000 }),
        fc.integer({ min: 0, max: 500 }),
        (floorPrice, addition) => {
          const unitPrice = floorPrice + addition;
          expect(requiresApproval(unitPrice, floorPrice)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


import { isValidContractFile, ALLOWED_CONTRACT_TYPES, MAX_CONTRACT_SIZE } from '../models/Order.js';

/**
 * **Feature: makrite-crm-mvp, Property 13: Contract File Validation**
 * **Validates: Requirements 7.3**
 */
describe('Property 13: Contract File Validation', () => {
  it('accepts valid file types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTRACT_TYPES),
        fc.integer({ min: 1, max: MAX_CONTRACT_SIZE }),
        (fileType, fileSize) => {
          const result = isValidContractFile(fileType, fileSize);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects invalid file types', () => {
    const invalidTypes = ['text/plain', 'application/zip', 'video/mp4', 'audio/mp3'];
    fc.assert(
      fc.property(
        fc.constantFrom(...invalidTypes),
        fc.integer({ min: 1, max: MAX_CONTRACT_SIZE }),
        (fileType, fileSize) => {
          const result = isValidContractFile(fileType, fileSize);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('FILE_TYPE_INVALID');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects files exceeding size limit', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTRACT_TYPES),
        fc.integer({ min: MAX_CONTRACT_SIZE + 1, max: MAX_CONTRACT_SIZE * 2 }),
        (fileType, fileSize) => {
          const result = isValidContractFile(fileType, fileSize);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('FILE_SIZE_EXCEEDED');
        }
      ),
      { numRuns: 100 }
    );
  });
});
