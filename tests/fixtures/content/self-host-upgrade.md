---
title: "Self-host upgrade (test fixture)"
description: "Synthetic self-hosting page for the e2e suite."
---

# Self-host upgrade (test fixture)

`self-hosting/[slug].astro` always builds `/self-hosting/upgrade/` — this fixture exists so the
fixture build doesn't fail on a missing `siteDocs` "self-host-upgrade" entry.
