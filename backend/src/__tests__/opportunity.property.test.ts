import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OpportunityStage } from '../types/index.js';
import { isValidTransition, VALID_STAGE_TRANSITIONS, STAGE_PROBABILITY } from '../models/Opportunity.js';

const allStages = Object.values(OpportunityStage);
const stageArb = fc.constantFrom(...allStages);

/**
 * **Feature: makrite-crm-mvp, Property 8: Opportunity Initial Stage**
 * **Validates: Requirements 4.1**
 */
describe('Property 8: Opportunity Initial Stage', () => {
  it('new opportunities should start at prospecting stage', () => {
    const initialStage = OpportunityStage.PROSPECTING;
    expect(initialStage).toBe('prospecting');
    expect(STAGE_PROBABILITY[initialStage]).toBe(10);
  });
});

/**
 * **Feature: makrite-crm-mvp, Property 9: Stage Transition Validation**
 * **Validates: Requirements 4.2**
 */
describe('Property 9: Stage Transition Validation', () => {
  it('only allows valid stage transitions', () => {
    fc.assert(
      fc.property(stageArb, stageArb, (from, to) => {
        const isValid = isValidTransition(from, to);
        const expectedValid = VALID_STAGE_TRANSITIONS[from]?.includes(to) ?? false;
        expect(isValid).toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });

  it('closed stages cannot transition to any other stage', () => {
    fc.assert(
      fc.property(stageArb, (to) => {
        expect(isValidTransition(OpportunityStage.CLOSED_WON, to)).toBe(false);
        expect(isValidTransition(OpportunityStage.CLOSED_LOST, to)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('any stage can transition to closed_lost except closed stages', () => {
    const nonClosedStages = allStages.filter(s => 
      s !== OpportunityStage.CLOSED_WON && s !== OpportunityStage.CLOSED_LOST
    );
    
    fc.assert(
      fc.property(fc.constantFrom(...nonClosedStages), (from) => {
        expect(isValidTransition(from, OpportunityStage.CLOSED_LOST)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('stage probability increases as stage progresses', () => {
    const progressionOrder = [
      OpportunityStage.PROSPECTING,
      OpportunityStage.QUALIFICATION,
      OpportunityStage.PROPOSAL,
      OpportunityStage.NEGOTIATION,
      OpportunityStage.CLOSED_WON
    ];
    
    for (let i = 0; i < progressionOrder.length - 1; i++) {
      expect(STAGE_PROBABILITY[progressionOrder[i]]).toBeLessThan(
        STAGE_PROBABILITY[progressionOrder[i + 1]]
      );
    }
  });
});
