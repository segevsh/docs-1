---
title: "A deliberately long title meant to wrap across multiple lines in both the rail and the page heading without ever forcing a horizontal scrollbar"
section: "edge-cases"
sourceRepo: "w6w-io/docs-test-fixtures"
sourcePath: "edge-cases/long-title.md"
syncedAt: "2026-01-01T00:00:00Z"
---

# A deliberately long title meant to wrap across multiple lines in both the rail and the page heading without ever forcing a horizontal scrollbar

Regression fixture for the rail's horizontal-scroll bug (`overflow-y: auto` implicitly flipping
`overflow-x` to `auto` too) — this title's length is the reproduction case.

Also carries one long, unbroken token to check word-wrapping specifically:
`AVeryLongUnbrokenIdentifierNameThatHasNoSpacesOrHyphensAnywhereInItAtAllWhatsoever`.
