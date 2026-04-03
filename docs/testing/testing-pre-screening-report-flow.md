# Pre-screening report tests

This repo now has a small regression net around the pre-screening report flow. It is intentionally narrow.

## Why this slice exists

The pre-screening flow is the first stable place to add meaningful tests because it protects a critical business handoff:

```text
conversation transcript
  -> report prompt construction / model-output parsing
  -> stored report status becomes READY
  -> report-ready UI renders
  -> user can continue to diagnostic
```

This gives fast signal without dragging in LiveKit, camera/mic permissions, or database integration.

## Test files

### `src/pre-screening/pre-screening-report.test.ts`

Contract tests for `src/pre-screening/pre-screening-report.ts`.

It covers:

- `sanitizeModelJsonText`
- `renderPreScreenPromptTemplate`
- `appendPreScreenPromptFormatInstructions`
- `buildPreScreenPrompt`
- `parsePreScreenReportResponse`

Why these matter:

- if prompt placeholders stop rendering correctly, model context degrades
- if JSON sanitization breaks, valid model output can become unparsable
- if schema parsing breaks, reports stop becoming usable even when evaluation returns data

### `src/pre-screening/pre-screening-page.test.tsx`

A route-owned UI regression test for `src/pre-screening/pre-screening-page.tsx`.

It covers:

- waiting state renders when a `sessionId` is present in the URL
- polling fetch returns a READY report
- the page transitions to the ready state
- the CTA to continue to diagnostic is visible

Why this matters:

- it protects the user-visible transition from "report is processing" to "report is ready"
- it catches regressions in polling/state wiring without requiring a full router or backend stack

## Why the page component was extracted

Originally the screen lived only inside `src/routes/pre-screening.index.tsx`.
That route file is coupled to the TanStack file-route macro, which made direct testing noisy and brittle.

To keep the runtime behavior unchanged but make the screen testable, the route now delegates to:

- `src/pre-screening/pre-screening-page.tsx`

And the route file stays thin:

- `src/routes/pre-screening.index.tsx`

This is a testability improvement, not a behavior change.

## Mocking strategy

### Report test

The report test mocks only the raw rubric import:

- `../../rubrics/pre-call.md?raw`

That keeps `buildPreScreenPrompt` deterministic without mocking the actual helper logic we want to trust.

### Page test

The page test mocks only the hard boundaries:

- `usePreScreeningFlow`
- `InterviewLiveKitSession`
- `fetch`

It does **not** mock:

- the report panel
- URL session helpers
- the page’s own polling/state logic

That is deliberate. If you mock those too, the test stops protecting real behavior.

## How to run the tests

Run each file by itself first:

```bash
pnpm exec vp test run src/pre-screening/pre-screening-report.test.ts
pnpm exec vp test run src/pre-screening/pre-screening-page.test.tsx
```

Run them together:

```bash
pnpm exec vp test run src/pre-screening/pre-screening-report.test.ts src/pre-screening/pre-screening-page.test.tsx
```

## How to debug failures

### If `pre-screening-report.test.ts` fails

Check which section failed:

- `sanitizeModelJsonText`
  - model output formatting changed
  - fenced or prefixed JSON is no longer being normalized correctly
- `renderPreScreenPromptTemplate`
  - placeholder substitution changed
  - missing values no longer map to `Not provided`
- `buildPreScreenPrompt`
  - bundled prompt loading changed
  - prompt instructions or prompt hashing changed
- `parsePreScreenReportResponse`
  - schema changed
  - upstream report shape drifted
  - enum values no longer match expected categories

### If `pre-screening-page.test.tsx` fails

Check these in order:

1. URL state
   - does `sessionId` still come from the query string?
2. polling path
   - is the page still fetching `/api/livekit/pre-screening/:sessionId`?
3. status transition
   - does `READY` still move the page into the ready state?
4. report panel expectations
   - did visible user-facing copy change?

If the UI text changed intentionally, update the assertion.
If the state transition changed unintentionally, fix the page logic instead of weakening the test.

## Important config gotcha

During this work, `vp test run` produced noisy output:

- `ReferenceError: module is not defined`
- Vite server shutdown timeout after passing tests

Root cause:

- the `nitro()` Vite plugin was being loaded during test runs
- that plugin stack introduced non-test runtime behavior into Vitest

Fix:

- `vite.config.ts` now skips `nitro()` when `process.env.VITEST` is set

This is important for future debugging: if that noise comes back, check test-time plugin loading before changing the tests.

## How to extend the suite safely

Add tests in this order:

### 1. Expand report contract coverage first

Good additions:

- parsing valid `job_research_breakdown`
- parsing `job_research_category`
- malformed JSON edge cases
- unexpected surrounding text around model output

### 2. Expand page behavior second

Good additions:

- FAILED report status shows error state
- retry path returns PROCESSING and re-enters waiting state
- missing optional report fields still render a usable ready panel

### 3. Only add shared test helpers when duplication is real

Do **not** build a `test-utils` layer just because it feels tidy.
Add shared fixtures/helpers only after at least 2-3 tests repeat the same setup.

## What to avoid

Avoid these anti-patterns:

- snapshotting the full report panel markup
- mocking the report panel itself
- mocking all hooks and asserting only mock calls
- testing Tailwind classes
- adding test-only exports to production code
- pulling in LiveKit or database setup for this slice

Those make tests slower and less trustworthy.

## Decision rule for future tests

Use:

- **unit tests** for pure parsing/prompt/normalization logic
- **page-level tests** for route-owned state transitions and visible outcomes
- **larger integration tests** only when multiple boundaries truly need to be exercised together

If a test can prove the behavior with one fewer dependency, prefer the smaller test.
