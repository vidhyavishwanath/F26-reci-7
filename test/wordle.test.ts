import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Read the spec in src/wordle/matchGuess.ts.
// Two alphabets: a tiny one makes duplicate letters common, a full one makes
// letters absent from the secret common. Each hides a different kind of bug.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SMALL = 'ABC';

const wordOf = (alphabet: string) =>
  fc.array(fc.constantFrom(...alphabet), { minLength: 5, maxLength: 5 }).map(a => a.join(''));

const small = wordOf(SMALL);
const large = wordOf(ALPHABET);
// Mix of both so every property sees duplicate-heavy and letter-diverse words.
const word = fc.oneof(small, large);
const pair = fc.tuple(word, word);

const count = (s: string, c: string) => [...s].filter(x => x === c).length;

// Pattern: invariant. The result always has exactly five colors, each G, Y, or B.
it('returns exactly five colors, each G, Y, or B', () => {
  fc.assert(
    fc.property(pair, ([secret, guess]) => {
      const r = matchGuess(secret, guess);
      expect(r).toHaveLength(5);
      for (const c of r) expect(['G', 'Y', 'B']).toContain(c);
    }),
  );
});

// Pattern: invariant. A position is green exactly when guess and secret agree there.
it('is green exactly where guess[i] === secret[i]', () => {
  fc.assert(
    fc.property(pair, ([secret, guess]) => {
      const r = matchGuess(secret, guess);
      for (let i = 0; i < 5; i++) expect(r[i] === 'G').toBe(guess[i] === secret[i]);
    }),
  );
});

// Pattern: invariant. Yellow only for letters that occur in the secret, and black
// for letters that do not.
it('never marks a letter absent from the secret as non-black', () => {
  fc.assert(
    fc.property(pair, ([secret, guess]) => {
      const r = matchGuess(secret, guess);
      for (let i = 0; i < 5; i++) {
        if (!secret.includes(guess[i])) expect(r[i]).toBe('B');
        if (r[i] === 'Y') expect(secret.includes(guess[i])).toBe(true);
      }
    }),
  );
});

// Pattern: invariant. For each letter, the number of G/Y marks is exactly
// min(occurrences in secret, occurrences in guess): never over-credited, and
// never under-credited.
it('credits each letter min(secret count, guess count) times', () => {
  fc.assert(
    fc.property(pair, ([secret, guess]) => {
      const r = matchGuess(secret, guess);
      for (const L of new Set(guess)) {
        const credited = [...guess].filter((c, i) => c === L && r[i] !== 'B').length;
        expect(credited).toBe(Math.min(count(secret, L), count(guess, L)));
      }
    }),
  );
});

// Pattern: invariant. Yellows are assigned left to right: after a black, no later
// copy of that letter is yellow, and a black means every secret copy is used up.
it('assigns yellows left to right, after greens', () => {
  fc.assert(
    fc.property(pair, ([secret, guess]) => {
      const r = matchGuess(secret, guess);
      for (let i = 0; i < 5; i++) {
        if (r[i] !== 'B') continue;
        // Once a letter has a black, no later occurrence of it is yellow.
        for (let j = i + 1; j < 5; j++) {
          if (guess[j] === guess[i]) expect(r[j]).not.toBe('Y');
        }
        // A black means every secret copy is already used by a green or yellow.
        const used = [...guess].filter((c, k) => c === guess[i] && r[k] !== 'B').length;
        expect(used).toBe(count(secret, guess[i]));
      }
    }),
  );
});

// Pattern: algebraic. Guessing the secret gives all greens.
it('guessing the secret gives all greens', () => {
  fc.assert(
    fc.property(word, secret => {
      expect(matchGuess(secret, secret)).toEqual(['G', 'G', 'G', 'G', 'G']);
    }),
  );
});

// Pattern: conditional. If guess and secret share no letters, everything is black.
// Targeted generator: draw the secret from one half of the alphabet and the guess
// from the other half, so the condition holds by construction.
it('gives all black when the words share no letters', () => {
  const disjoint = fc
    .shuffledSubarray([...ALPHABET], { minLength: 2, maxLength: 26 })
    .chain(letters =>
      fc.integer({ min: 1, max: letters.length - 1 }).chain(cut =>
        fc.tuple(
          wordOf(letters.slice(0, cut).join('')),
          wordOf(letters.slice(cut).join('')),
        ),
      ),
    );
  fc.assert(
    fc.property(disjoint, ([secret, guess]) => {
      expect(matchGuess(secret, guess)).toEqual(['B', 'B', 'B', 'B', 'B']);
    }),
  );
});

// Pattern: conditional. If the guess is a permutation of the secret with no fixed
// points, there are no greens and every position is yellow.
// Targeted generator: shuffle the secret's positions via a derangement (a rotation
// by 1-4 positions only works when letters differ, so build from distinct letters).
it('gives all yellow for a fixed-point-free rearrangement of distinct letters', () => {
  const gen = fc
    .shuffledSubarray([...ALPHABET], { minLength: 5, maxLength: 5 })
    .chain(letters =>
      fc.integer({ min: 1, max: 4 }).map(k => {
        const secret = letters.join('');
        const guess = letters.map((_, i) => letters[(i + k) % 5]).join('');
        return [secret, guess] as const;
      }),
    );
  fc.assert(
    fc.property(gen, ([secret, guess]) => {
      expect(matchGuess(secret, guess)).toEqual(['Y', 'Y', 'Y', 'Y', 'Y']);
    }),
  );
});

// Pattern: metamorphic. Renaming letters consistently (a bijection applied to both
// words) does not change the result.
it('is unchanged by a consistent renaming of letters', () => {
  const perm = fc.shuffledSubarray([...ALPHABET], { minLength: 26, maxLength: 26 });
  fc.assert(
    fc.property(pair, perm, ([secret, guess], p) => {
      const rename = (w: string) => [...w].map(c => p[ALPHABET.indexOf(c)]).join('');
      expect(matchGuess(rename(secret), rename(guess))).toEqual(matchGuess(secret, guess));
    }),
  );
});

// Pattern: metamorphic. Replacing one guess letter with a letter absent from the
// secret makes that position black and leaves every green where it was.
it('replacing a guess letter with an absent one blackens it and keeps greens', () => {
  fc.assert(
    fc.property(large, large, fc.integer({ min: 0, max: 4 }), (secret, guess, i) => {
      const absent = [...ALPHABET].filter(c => !secret.includes(c));
      const before = matchGuess(secret, guess);
      const changed = guess.slice(0, i) + absent[0] + guess.slice(i + 1);
      const after = matchGuess(secret, changed);
      expect(after[i]).toBe('B');
      for (let j = 0; j < 5; j++) {
        if (j !== i && before[j] === 'G') expect(after[j]).toBe('G');
      }
    }),
  );
});

describe('preconditions', () => {
  it('rejects bad input', () => {
    expect(() => matchGuess('abcde', 'ABCDE')).toThrow(RangeError);
    expect(() => matchGuess('ABCD', 'ABCDE')).toThrow(RangeError);
  });
});
