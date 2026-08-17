# Aegis Twin — Prompt Library

Three documents. Each one is self-contained and paste-ready.

| File | Use it when | Length |
| --- | --- | --- |
| **`AEGIS_TWIN_MASTER_PROMPT.md`** | You want to **rebuild Aegis Twin from zero** — exact stack, file tree, API contract, design tokens, AI policy, schema, tests. | 961 lines |
| **`AEGIS_TWIN_WINNING_WORKFLOW.md`** | You want the product to **work correctly and win** — the 7-stage decision loop, state machine, latency budget, gap plan, 90-second demo script, judge Q&A. | 436 lines |
| **`AEGIS_TWIN_NOW_VS_SHOULD_BE.md`** | You want the **honest audit** — what is real, what is seeded, what is simulated, what is missing, and the 7-hour / 2-hour plans to close it. | ~330 lines |

## Suggested order

1. Read **NOW vs SHOULD BE** §2–3 to see exactly where the code stands today.
2. Run the paste-ready prompt in **NOW vs SHOULD BE** §6 (or §7 if you're short on time) to close
   the gaps.
3. Rehearse with **WINNING WORKFLOW** §11 (demo choreography), §13 (Q&A defence) and §15
   (the three moments that win the room).
4. Keep **MASTER PROMPT** as the reference spec for anything you need to rebuild or explain.

## The short version

- The loop is `OBSERVE → ORIENT → DECIDE → ACT → VERIFY → RECORD`. Most projects stop at DECIDE.
- What's real: Deepgram streaming, Gemini + the validation layer, Murf, the evidence parser, the
  fallback ladder.
- What's not: real containment, case memory, verification, latency proof.
- What wins: the six-second verdict, the kill-switch resilience moment, and the prompt-injection
  that fails.
