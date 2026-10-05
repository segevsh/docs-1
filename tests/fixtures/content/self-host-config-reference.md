---
title: "Self-host config reference (test fixture)"
description: "Synthetic self-hosting page for the e2e suite."
---

# Self-host config reference (test fixture)

`self-hosting/[slug].astro` always builds `/self-hosting/config-reference/` — this fixture exists so the
fixture build doesn't fail on a missing `siteDocs` "self-host-config-reference" entry.
