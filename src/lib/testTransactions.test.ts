import { describe, it, expect } from 'vitest';
import { isTestTransaction } from './testTransactions';

describe('isTestTransaction', () => {
  it('flags G1-FIX8 metadata marker', () => {
    expect(isTestTransaction({ ebilling_reference: 'FIX8-TEST-PENDING', metadata: { test: 'G1-FIX8' } })).toBe(true);
  });
  it('flags FLR-TEST-RECETTE-001 by reference', () => {
    expect(isTestTransaction({ ebilling_reference: 'FLR-TEST-RECETTE-001', metadata: { mode: 'payant' } })).toBe(true);
  });
  it('keeps a real transaction without bill_id', () => {
    expect(isTestTransaction({ ebilling_reference: 'FLR-1772907574010-0tv1js', metadata: {} })).toBe(false);
  });
});
