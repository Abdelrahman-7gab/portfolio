import { describe, expect, it } from 'vitest';
import { duration, months } from './time';

describe('trace durations', () => {
  it('count months inclusively, like LinkedIn', () => {
    expect(duration(months([2024, 3], [2026, 11]))).toBe('2Y 9M');
    expect(duration(months([2023, 1], [2024, 4]))).toBe('1Y 4M');
    expect(duration(months([2021, 8], [2023, 1]))).toBe('1Y 6M');
    expect(duration(months([2020, 10], [2021, 8]))).toBe('11M');
  });
});

