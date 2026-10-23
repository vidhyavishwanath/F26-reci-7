import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Recitation Part 2 (groups) and problem set Task 2.
// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

// Valid by construction: start, then a non-negative length, so start <= end.
// A small range makes touching, nested, and duplicate intervals common; the
// wide range adds multi-digit and negative endpoints (for the sort bug).
const intervalIn = (min: number, max: number): fc.Arbitrary<Interval> =>
  fc.tuple(fc.integer({ min, max }), fc.nat({ max: 10 })).map(([s, len]): Interval => [s, s + len]);
const intervalList = fc.oneof(
  fc.array(intervalIn(-20, 20), { maxLength: 8 }),
  fc.array(intervalIn(-100, 100), { maxLength: 8 }),
);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Add your properties here. Aim for at least one of each pattern:
  // invariant, algebraic, metamorphic, differential, conditional.

  // Pattern: invariant. The output is sorted, and consecutive intervals neither overlap nor touch.
  it("the output is sorted and consecutive intervals don't overlap or touch", () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let i = 0; i + 1 < out.length; i++) {
          expect(out[i][1]).toBeLessThan(out[i + 1][0]);
        }
      }),
    );
  });

  // Pattern: invariant. The input array and its intervals are not modified.
  it('does not modify its input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const snapshot = xs.map(([s, e]): Interval => [s, e]);
        mergeIntervals(xs);
        expect(xs).toEqual(snapshot);
      }),
    );
  });

  // Pattern: invariant. The output is empty exactly when the input is empty.
  it('is empty iff the input is empty', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        expect(mergeIntervals(xs).length === 0).toBe(xs.length === 0);
      }),
    );
  });

  // Pattern: algebraic. Merging is idempotent: merging an already-merged list changes nothing.
  it('is idempotent', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        expect(mergeIntervals(once)).toEqual(once);
      }),
    );
  });

  // Pattern: metamorphic. Reordering the input (and adding a duplicate) does not change the output.
  it('ignores input order and duplicates', () => {
    fc.assert(
      fc.property(intervalList, fc.nat(), (xs, k) => {
        const expected = mergeIntervals(xs);
        const reversed = [...xs].reverse();
        expect(mergeIntervals(reversed)).toEqual(expected);
        const rotated = [...xs.slice(k % (xs.length || 1)), ...xs.slice(0, k % (xs.length || 1))];
        expect(mergeIntervals(rotated)).toEqual(expected);
        if (xs.length > 0) expect(mergeIntervals([...xs, xs[k % xs.length]])).toEqual(expected);
      }),
    );
  });

  // Pattern: differential. A point (integer or half-integer) is covered by the output
  // exactly when it is covered by the input. Uses a small "is p covered?" oracle only.
  it('covers exactly the same points as the input', () => {
    const covered = (list: readonly Interval[], p: number) => list.some(([s, e]) => s <= p && p <= e);
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let p = -112; p <= 122; p += 0.5) {
          expect(covered(out, p)).toBe(covered(xs, p));
        }
      }),
    );
  });

  // Pattern: conditional. If the input is already disjoint (no touching, no overlap),
  // the output is the same intervals sorted. Targeted generator: each start is the
  // previous end plus a gap of at least 1, so disjointness holds by construction.
  it('leaves already-disjoint input unchanged (up to order)', () => {
    const disjoint = fc
      .array(fc.tuple(fc.nat({ max: 5 }), fc.nat({ max: 5 })), { maxLength: 8 })
      .map(parts => {
        let cursor = -20;
        return parts.map(([gap, len]): Interval => {
          const s = cursor + gap + 1;
          cursor = s + len;
          return [s, cursor];
        });
      });
    fc.assert(
      fc.property(disjoint, fc.nat(), (sortedList, k) => {
        const n = sortedList.length || 1;
        const shuffled = [...sortedList.slice(k % n), ...sortedList.slice(0, k % n)];
        expect(mergeIntervals(shuffled)).toEqual(sortedList);
      }),
    );
  });

  // Example test, not counted as a property.
  it('rejects invalid intervals', () => {
    expect(() => mergeIntervals([[2, 1]])).toThrow(RangeError);
    expect(() => mergeIntervals([[0.5, 1]])).toThrow(RangeError);
  });
});
