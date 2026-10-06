---
key: "long-title"
title: "A deliberately long title meant to wrap across multiple lines in both the rail and the page heading without ever forcing a horizontal scrollbar"
section: "guides"
description: "Edge-case fixture whose long title exercises rail and heading wrapping."
summary: "Regression fixture for the rail's horizontal-scroll bug."
format: "markdown"
shared: true
order: 2
position: 1
sourceRepo: "w6w-io/docs-test-fixtures"
sourcePath: "guides/long-title.md"
sourceSha: "8f14e45fceea167a5a36dedd4bea2543a1b2c3d4"
sourceRefSha: "0a1b2c3d4e5f60718293a4b5c6d7e8f901234567"
sourceUrl: "https://github.com/w6w-io/docs-test-fixtures/blob/0a1b2c3d4e5f60718293a4b5c6d7e8f901234567/guides/long-title.md"
syncedAt: "2026-01-01T00:00:00Z"
---

# A deliberately long title meant to wrap across multiple lines in both the rail and the page heading without ever forcing a horizontal scrollbar

Regression fixture for the rail's horizontal-scroll bug (`overflow-y: auto` implicitly flipping
`overflow-x` to `auto` too) — this title's length is the reproduction case.

Also carries one long, unbroken token to check word-wrapping specifically:
`AVeryLongUnbrokenIdentifierNameThatHasNoSpacesOrHyphensAnywhereInItAtAllWhatsoever`.
