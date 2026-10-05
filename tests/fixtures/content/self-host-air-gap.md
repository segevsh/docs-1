---
title: "Self-host air-gap (test fixture)"
description: "Synthetic self-hosting page for the e2e suite."
---

# Self-host air-gap (test fixture)

`self-hosting/[slug].astro` always builds `/self-hosting/air-gap/` — this fixture exists so the
fixture build doesn't fail on a missing `siteDocs` "self-host-air-gap" entry.
