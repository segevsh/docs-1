---
title: "Self-host troubleshooting (test fixture)"
description: "Synthetic self-hosting page for the e2e suite."
---

# Self-host troubleshooting (test fixture)

`self-hosting/[slug].astro` always builds `/self-hosting/troubleshooting/` — this fixture exists so the
fixture build doesn't fail on a missing `siteDocs` "self-host-troubleshooting" entry.
