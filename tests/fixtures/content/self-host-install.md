---
title: "Self-host install (test fixture)"
description: "Synthetic self-hosting page for the e2e suite."
---

# Self-host install (test fixture)

`self-hosting/[slug].astro` always builds `/self-hosting/install/` — this fixture exists so the
fixture build doesn't fail on a missing `siteDocs` "self-host-install" entry.
