import { describe, it, expect } from 'vitest';
import { rateVital } from './WebVitalsPanel';

describe('Seuils AAA Core Web Vitals', () => {
  it('LCP conforme sous 2,5 s', () => { expect(rateVital('LCP', 2500)).toBe('good'); expect(rateVital('LCP', 2600)).toBe('needs'); });
  it('INP conforme sous 200 ms', () => { expect(rateVital('INP', 200)).toBe('good'); expect(rateVital('INP', 201)).toBe('needs'); });
  it('CLS conforme sous 0,1', () => { expect(rateVital('CLS', 0.1)).toBe('good'); expect(rateVital('CLS', 0.3)).toBe('poor'); });
});
