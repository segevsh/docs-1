---
key: "air-gap"
title: "Air-gapped installs"
section: "self-hosting"
description: "Run a licensed w6w install with no outbound network: exchange keys with your vendor and import an offline licence."
summary: null
format: "markdown"
shared: true
order: 50
position: 5
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/self-hosting/air-gap.md"
sourceSha: "ae4e6e9ea39b4af11291af12a645509d4cb189ad"
sourceRefSha: "40127346cb4c16c6f06e5b4546527b9d7a62a25b"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/40127346cb4c16c6f06e5b4546527b9d7a62a25b/docs/self-hosting/air-gap.md"
syncedAt: "2026-10-06T21:22:23Z"
---


# Air-gapped installs

An air-gapped install never calls out to a licensing service. Instead you exchange a small amount of
data with your vendor out of band, and the warden (the service that holds your installation's key
and licence state) adopts the result.

1. **Export your public keys.** Run `w6w-warden export-keys` on the warden. It prints the public
   identity and licence keys for this installation. They are public values, safe to send by email or
   removable media.
2. **Send them to your vendor.** The vendor returns an offline licence bound to those keys.
3. **Import it at the warden.** Use the warden's offline-licence import subcommand (see
   `w6w-warden --help`), passing the file you received. The warden verifies the file before adopting
   it, and refuses one that is not bound to this installation.
4. **Check the result.** `w6w-warden status` shows the licensed level the host now reads from the
   warden. The host makes no licensing network call.

An offline licence has an expiry. Once it has lapsed, the install returns to base level until you
import a renewed one, so request the next file before the current one runs out. The host keeps
serving work at base limits in the meantime. Licensing never blocks the whole installation.

Back up the warden's data separately from the database, see
[Backup and restore](/self-hosting/backup/).

An air-gapped host also cannot fetch the app catalog from a remote repository. Load the pack baked
into the image, as described in [Install](/self-hosting/install/).
