import { describe, it, expect } from 'vitest';
import {
  DEFAULT_OFFER_COMPARISON,
  decodeOfferComparisonFromUrl,
  encodeOfferComparisonForUrl,
  mergeOfferComparison,
} from '../src/lib/offerUrlState';

describe('offer URL codec', () => {
  it('round-trips a modified offer comparison', () => {
    const snapshot = {
      ...DEFAULT_OFFER_COMPARISON,
      newOffer: {
        ...DEFAULT_OFFER_COMPARISON.newOffer,
        baseSalary: 225000,
        company: 'Growth Co',
      },
      prefs: {
        ...DEFAULT_OFFER_COMPARISON.prefs,
        compFocus: 'long_term' as const,
      },
    };

    const encoded = encodeOfferComparisonForUrl(snapshot);
    expect(encoded).toBeTruthy();

    const decoded = decodeOfferComparisonFromUrl(encoded!);
    const merged = mergeOfferComparison(DEFAULT_OFFER_COMPARISON, decoded);

    expect(merged.newOffer.baseSalary).toBe(225000);
    expect(merged.newOffer.company).toBe('Growth Co');
    expect(merged.prefs.compFocus).toBe('long_term');
  });

  it('returns undefined encoding for default snapshot', () => {
    expect(encodeOfferComparisonForUrl(DEFAULT_OFFER_COMPARISON)).toBeUndefined();
  });
});
