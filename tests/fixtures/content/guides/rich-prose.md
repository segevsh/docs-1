---
key: "rich-prose"
title: "Rich prose"
section: "guides"
description: "Every markdown element the prose styles cover, on one page."
summary: "Every markdown element the prose styles cover, on one page."
format: "markdown"
shared: true
order: 1
position: 0
sourceRepo: "w6w-io/docs-test-fixtures"
sourcePath: "guides/rich-prose.md"
sourceSha: "8f14e45fceea167a5a36dedd4bea2543a1b2c3d4"
sourceRefSha: "0a1b2c3d4e5f60718293a4b5c6d7e8f901234567"
sourceUrl: "https://github.com/w6w-io/docs-test-fixtures/blob/0a1b2c3d4e5f60718293a4b5c6d7e8f901234567/guides/rich-prose.md"
syncedAt: "2026-01-01T00:00:00Z"
---

# Rich prose

Exercises every markdown element the prose styles cover, in one page, so a CSS
regression on any of them shows up here first.

## Headings and text

A paragraph with **bold**, *italic*, `inline code`, and a [link](https://w6w.io).

### A level-3 heading

#### A level-4 heading

## Lists

- One
- Two
  - Nested A
  - Nested B
- Three

1. First
2. Second
3. Third

## Blockquote

> A blockquote, to check the accent-border treatment reads correctly in both themes.

## Table

| Column A | Column B | Column C |
|---|---|---|
| one   | two   | three |
| four  | five  | six   |

## Code block

```ts
export function outputPath(source: DocSource): string {
  return `${source.section}/${source.slug}.md`;
}
```

## Horizontal rule

---

Text after the rule.
