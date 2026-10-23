# Reflection

**Name / Andrew ID:** Vidhya Vishwanath, vvishwan

**Recitation group members (Task 2):**
Was not able to attend reci due to my flight
---

### 1. Valid but weak

Pick a property you wrote that passes on the correct implementation but
kills few or no mutants. Why is it still a *valid* property? Describe a
concrete bug (not one of our mutants) that it *would* catch.

A property that passes on the correct implementation is the returns 5 colors that are either G, Y, or B. All the public mutants will return those 5 colors, being either G, Y, or B but there's no guarantee that they are in the right order. However, it would catch a input that is less than 5 letters or an output that maybe has R in it.

### 2. A generator problem, not a property problem

Describe a mutant, from either task, that survived or was flaky because of
your **generator** rather than your property. What did the generator fail to
produce? How did you fix it? Paste the runner output from before and after.

A mutant that was flaky because of the generator was swapped. The original generator just had a small subset of letters to draw from, so I changed it to have A-Z, as well.
Initial
  ✔ swapped        killed  by: never marks a letter absent from the secret as non-black; credits each letter min(secret count, guess count) times; assigns yellows left to right, after greens; replacing a guess letter with an absent one blackens it and keeps greens; rejects bad input
      Counterexample: [["CCCBC","AAAAB"]]
      AssertionError: expected 'Y' to be 'B' // Object.is equality
Changed:
  ✔ swapped        killed  by: never marks a letter absent from the secret as non-black; credits each letter min(secret count, guess count) times; assigns yellows left to right, after greens; replacing a guess letter with an absent one blackens it and keeps greens; rejects bad input
      Counterexample: [["NAAAA","AMAAA"]]
      AssertionError: expected 'Y' to be 'B' // Object.is equality

### 3. Reading a counterexample

Paste one counterexample that the mutation runner printed for a killed
mutant. In 2–3 sentences, explain using the *specification* why that input
exposes the bug.
For mutant, ignoresCounts:
    Counterexample: [["AAAAB","ABABA"]]
    AssertionError: expected 2 to be 1
The secret word has one B, while the guess has 2 "B"s. However, it says a letter can only be marked yellow the amount of times it appears in the secret word. However, ignoresCounts marks both "B"'s as yellow because it appears in the secret word somewhere.
### 4. Your project

Name one function or module in your team's project that would benefit from
property-based testing. State two properties in English, name the pattern of
each, and describe the generator you'd need, including anything about its
inputs that a naive generator would get wrong.

One module that would benefit from property based testing would be in regards to our intro tour in OpenCode. It's difficult to use unit tests to mock how the user would interact in different settings with the demo. 

Property 1: Invariant
After any seuqence of user actions, the tour should be in a valid state, and the step index should reflect the state of the tour, which would remain regardless of the tour.

Property 2: Metamorphic
Pressing next and then back in the tour should return to the step that we started with as long as it's not the last step in the sequence.

Generator:
I'd generate a random series of actions, for next, back and such plus a random starting step to see where the properties could fail. I'm not picking actions uniformly at random, which is what a naive generator would do.
