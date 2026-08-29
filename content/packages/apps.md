---
sourceRepo: "w6w-io/w6w-apps"
sourcePath: "README.md"
lastChanged: "2026-08-19T04:26:26Z"
title: "w6w-apps"
section: "packages"
---

# w6w-apps

Official **w6w app pack** — first-party integrations shipped as a registry Pack.

> **Status:** Development · **License:** MIT · **Spec:** `PackManifest v1`

## Contents

`w6w-pack.json` at the repo root lists every app bundled here. Register the
whole pack in one call:

```ts
import { createRegistry } from "@w6w/registry";
await registry.registerPack("github:w6w-io/w6w-apps@main");
// → { pack, results, registered, failed }
```

Or install a single app by pointing at its subdirectory
(`github:w6w-io/w6w-apps@main#apps/slack`, `file:./apps/slack`, …).

Each app dir is a standalone w6w App: `package.json` (manifest under the `w6w`
field), `index.ts` (default export of `AppDefinition`), `actions/`, `auth/`,
`assets/icon.{svg,png}`, and its own `deno.json` / `tsconfig.json` / `tests/`.

| App | Categories | Auth | Actions |
|-----|------------|------|--------:|
| activecampaign | marketing, crm | api-key | 13 |
| acuityscheduling | calendar | basic, oauth2 | 9 |
| airbyte | data-warehousing, devops | application | 12 |
| aircall | communication, support, crm | basic | 38 |
| airtable | spreadsheets, databases, productivity | personal-access-token, oauth2, api-key | 10 |
| algolia | search, developer-tools | api-key | 22 |
| amplitude | analytics, marketing | api-keys | 15 |
| anthropic | ai | api-key | 14 |
| apify | developer-tools, storage, ai | api-token | 31 |
| apitemplateio | developer-tools | api-key | 5 |
| asana | productivity, project-management | access-token, oauth2 | 22 |
| ashby | hr, productivity | api-key | 27 |
| attio | crm | api-key | 29 |
| auth0 | security, developer-tools | client-credentials | 18 |
| azure-blob | storage, devops | shared-key | 14 |
| azuredevops | version-control, devops, project-management | pat | 19 |
| balena | iot, devops | api-key | 16 |
| bamboohr | hr | api-key | 18 |
| basecamp | project-management, productivity | oauth | 11 |
| baserow | databases, spreadsheets, productivity | database-token | 12 |
| bigcommerce | commerce, crm | access-token | 38 |
| bigquery | data-warehousing, databases | oauth2 | 18 |
| bitbucket | developer-tools | basic, access-token | 12 |
| bitly | marketing, analytics | access-token | 8 |
| bluesky | social-media, communication | app-password | 21 |
| box | storage | oauth2 | 10 |
| brevo | marketing, email | api-key | 15 |
| buffer | social-media, marketing | oauth2, api-key | 14 |
| cal | calendar | api-key | 8 |
| calendly | calendar, productivity | personal-access-token, oauth2 | 12 |
| callrail | marketing, communication, analytics | api-token | 26 |
| campaignmonitor | email, marketing | api-key, oauth2 | 42 |
| chargebee | commerce, finance | api-key | 17 |
| checkly | monitoring, devops, developer-tools | api-key | 25 |
| circle | communication, social-media | api-token | 33 |
| circleci | devops, developer-tools | api-token | 8 |
| clearbit | marketing, crm | api-key | 9 |
| clickup | project-management, productivity | api-token, oauth2 | 12 |
| clickhouse | databases, data-warehousing | api-key, service | 15 |
| clockify | productivity | api-key | 10 |
| close | crm | api-key | 21 |
| cloudflare | devops | api-token | 8 |
| cloudinary | storage, documents, developer-tools | basic | 21 |
| coda | productivity, documents | api-token | 11 |
| companycam | project-management, documents, productivity | access-token, oauth2 | 62 |
| confluence | documents, productivity | api-token, oauth2 | 22 |
| constantcontact | marketing, email | oauth2 | 22 |
| contentful | cms | access-token | 10 |
| copper | crm | api-key | 24 |
| customerio | marketing, email | basic | 7 |
| databricks | data-warehousing | bearer-token | 8 |
| datadog | monitoring, devops, developer-tools | api-key | 22 |
| dbtcloud | data-warehousing, devops, analytics | token | 23 |
| deel | hr, finance | api-token | 25 |
| deepgram | ai, video, developer-tools | api-key | 19 |
| deepl | ai | api-key | 8 |
| digitalocean | devops, storage | token | 15 |
| discord | communication | bot-token, oauth2 | 19 |
| discourse | communication, social-media | api-key | 26 |
| documenso | legal, documents, productivity | api-key | 20 |
| docusign | documents, legal, productivity | oauth2, oauth2-demo | 16 |
| dropbox | storage | access-token, oauth2 | 12 |
| dropbox-sign | legal, documents, productivity | api-key, oauth2 | 27 |
| easypost | commerce, developer-tools | api-key | 19 |
| elastic | search | api-key, basic | 9 |
| elevenlabs | ai | api-key | 22 |
| emailoctopus | marketing, email | api-key | 25 |
| eventbrite | commerce, calendar | personal-token, oauth2 | 10 |
| excel | spreadsheets, productivity | oauth2 | 16 |
| facebook | social-media, marketing | oauth2, page-token | 14 |
| facebook-conversions | marketing, analytics, social-media | conversions-token, oauth2 | 5 |
| facebook-lead-ads | marketing, social-media | oauth2, page-token | 2 |
| fathom | ai, productivity, video | api-key | 11 |
| figma | productivity, developer-tools | personal-access-token, oauth2 | 10 |
| fillout | forms, productivity | api-key | 8 |
| fireflies | ai, productivity, video | api-key | 25 |
| fivetran | data-warehousing, devops, analytics | api-key | 20 |
| flodesk | marketing, email | api-key, oauth2 | 22 |
| followupboss | crm | api-key | 26 |
| formstack | forms, productivity | access-token | 9 |
| freshdesk | support | api-key | 13 |
| freshservice | support, devops | api-key | 23 |
| front | support, communication, productivity | api-token | 30 |
| gcs | storage, devops | service-account | 16 |
| gemini | ai | api-key | 6 |
| gerrit | version-control, developer-tools | http-password | 11 |
| getresponse | marketing, email | api-key | 14 |
| ghost | cms, productivity | admin-api-key | 11 |
| gitea | version-control, developer-tools, devops | token | 26 |
| github | version-control, developer-tools | access-token, oauth2 | 24 |
| gitlab | developer-tools, version-control | access-token, oauth2 | 16 |
| gmail | communication, email | oauth2, service-account | 25 |
| google-ads | marketing, analytics | oauth2 | 14 |
| google-analytics | analytics, marketing | oauth2 | 23 |
| google-business-profile | marketing, productivity | oauth2 | 15 |
| google-calendar | calendar, productivity | oauth2, service-account | 8 |
| google-contacts | crm, productivity | oauth2 | 14 |
| google-docs | productivity, documents | oauth2, service-account | 20 |
| google-drive | storage, productivity | oauth2, service-account | 18 |
| google-forms | forms, productivity | oauth2, service-account | 12 |
| google-maps | developer-tools, search | api-key | 15 |
| google-sheets | spreadsheets, productivity | oauth2, service-account | 12 |
| google-slides | documents, productivity | oauth2, service-account | 17 |
| google-tasks | productivity, project-management | oauth2 | 13 |
| googlechat | communication | oauth2 | 18 |
| grafana | monitoring | service-account-token | 8 |
| gravityforms | forms, productivity | basic | 12 |
| greenhouse | hr | oauth-client-credentials, api-key | 24 |
| grist | spreadsheets, databases, productivity | api-key, oauth2 | 15 |
| gusto | hr, finance, productivity | oauth2, oauth2-demo | 23 |
| harvest | productivity | personal-access-token, oauth2 | 11 |
| helpscout | support | oauth2 | 13 |
| highlevel | crm, marketing | oauth2 | 18 |
| homeassistant | iot, productivity | token | 19 |
| housecallpro | crm, calendar, finance | api-key, oauth2 | 39 |
| hubspot | crm, marketing | private-app-token, oauth2, api-key | 42 |
| huggingface | ai, developer-tools | token | 14 |
| intercom | support, communication, crm | access-token, oauth2 | 14 |
| jenkins | devops | basic | 6 |
| jira | project-management, developer-tools | api-token, oauth2 | 15 |
| jobber | calendar, crm, finance | oauth2 | 28 |
| jotform | forms, productivity | api-key | 14 |
| jumpcloud | security, devops, hr | api-key | 31 |
| kajabi | commerce, crm, marketing | client-credentials | 49 |
| keap | crm, marketing, email | oauth2, access-key | 36 |
| kit | marketing, email | api-key | 18 |
| klaviyo | marketing, email | api-key | 23 |
| launchdarkly | devops, developer-tools | api-key | 21 |
| lemlist | marketing, email | api-key | 18 |
| lever | hr, productivity | api-key | 12 |
| linear | project-management, developer-tools | api-key, oauth2 | 11 |
| linkedin | social-media, marketing | oauth2, oauth2-community-management | 6 |
| linkedin-ads | marketing, analytics | oauth2, oauth2-audiences | 23 |
| looker | analytics, data-warehousing | api-credentials | 11 |
| loops | email, marketing, communication | api-key | 21 |
| mailcheck | email, marketing | api-key | 4 |
| mailchimp | marketing, communication | api-key, oauth2 | 15 |
| mailerlite | marketing, email | api-key | 16 |
| mailgun | email, communication | api-key | 14 |
| mailjet | email, marketing | basic | 17 |
| mandrill | email, marketing | api-key | 17 |
| manychat | marketing, communication, social-media | api-token | 25 |
| mastodon | social-media, communication | access-token | 18 |
| mattermost | communication, productivity | access-token | 13 |
| meilisearch | search, databases, developer-tools | api-key | 24 |
| metabase | analytics, databases | api-key | 17 |
| microsoft-todo | productivity, project-management | oauth2 | 19 |
| miro | productivity, project-management | oauth2 | 27 |
| mistral | ai | api-key | 4 |
| mixpanel | analytics, marketing | service-account | 13 |
| monday | project-management, productivity | api-token, oauth2 | 14 |
| mongodb-atlas | databases, devops | service-account | 19 |
| motion | productivity, project-management, calendar | api-key | 27 |
| mux | video, developer-tools, analytics | basic | 14 |
| netlify | devops | personal-access-token | 10 |
| newrelic | monitoring, analytics, devops | user-key | 17 |
| nocodb | spreadsheets, databases | api-token | 13 |
| notion | productivity, documents | internal-secret, oauth2 | 17 |
| odoo | crm, commerce | api-key | 21 |
| okta | security | api-token | 11 |
| onedrive | documents, storage | oauth2 | 18 |
| onepassword | security, developer-tools | connect-token, events-token | 14 |
| onesimpleapi | developer-tools | api-key | 7 |
| openai | ai, developer-tools | api-key | 13 |
| outlook | communication, email, calendar | oauth2 | 18 |
| paddle | commerce, finance | api-key | 21 |
| pagerduty | monitoring, devops | api-token, oauth2 | 14 |
| pandadoc | documents, legal, productivity | api-key | 16 |
| particle | iot, devops | access-token | 13 |
| paypal | commerce, finance | client-credentials | 13 |
| perplexity | ai | api-key | 5 |
| pinecone | ai, databases, search | api-key | 24 |
| pipedrive | crm | api-token, oauth2 | 14 |
| plaid | finance, databases | client-secret, client-secret-sandbox | 14 |
| podio | project-management, databases, productivity | app-auth, oauth2 | 29 |
| postbin | developer-tools | none | 5 |
| posthog | analytics | personal-api-key | 8 |
| postmark | email, communication | api-key | 13 |
| productboard | project-management, productivity, support | api-token | 41 |
| pushover | communication, monitoring | app-token | 4 |
| qdrant | search, databases, ai | api-key | 19 |
| quickbase | databases, productivity, project-management | user-token | 20 |
| quickbooks | finance | oauth2 | 20 |
| raindrop | productivity, search, storage | test-token, oauth2 | 39 |
| reddit | social-media | oauth2 | 8 |
| resend | email, communication | api-key | 24 |
| ringcentral | communication, productivity | oauth2, jwt-bearer | 13 |
| s3 | storage | aws-iam | 9 |
| salesforce | crm | access-token, oauth2 | 12 |
| sanity | cms, databases, developer-tools | token | 11 |
| segment | analytics | write-key | 6 |
| sendgrid | email, communication | sendgrid-api | 10 |
| sentry | monitoring, developer-tools | auth-token, oauth2 | 21 |
| servicenow | support, devops | basic, oauth2 | 9 |
| shopify | commerce | access-token | 18 |
| slack | communication | access-token, oauth2 | 47 |
| smartsheet | spreadsheets, productivity | access-token | 16 |
| snowflake | data-warehousing | key-pair | 5 |
| snyk | security, developer-tools | api-token | 20 |
| splitwise | finance, productivity | api-key | 26 |
| splunk | monitoring, devops | token | 8 |
| spotify | productivity | oauth2 | 9 |
| square | commerce, finance | access-token | 17 |
| statuspage | monitoring, communication, devops | api-key | 12 |
| storyblok | cms, marketing | delivery-token, management-token | 14 |
| strapi | cms | api-token | 6 |
| strava | productivity | oauth2 | 9 |
| stripe | commerce, finance | api-key | 23 |
| supabase | databases | api-key | 7 |
| surveymonkey | forms, productivity | oauth2 | 12 |
| tailscale | security, devops | api-key, oauth-client | 16 |
| tally | forms, productivity | api-key | 38 |
| teams | communication | oauth2 | 16 |
| telegram | communication | bot-token | 21 |
| terraform | devops, developer-tools | token | 20 |
| thinkific | commerce, crm | api-key | 20 |
| thrivecart | commerce, marketing | api-token | 33 |
| ticktick | productivity, project-management | oauth2 | 23 |
| tidycal | calendar, productivity | personal-token, oauth2 | 18 |
| tldv | ai, productivity, video | api-key | 5 |
| todoist | productivity | api-token, oauth2 | 14 |
| toggl | productivity | api-token | 10 |
| trello | project-management, productivity | api-key | 27 |
| twilio | communication | api-key | 2 |
| twitch | video, social-media, communication | app-access-token, user-access-token | 28 |
| twitter | social-media | oauth2 | 8 |
| typeform | forms, productivity | personal-access-token, oauth2 | 10 |
| typesense | search, databases | api-key | 16 |
| upstash | databases | rest-token | 15 |
| uptimerobot | monitoring | api-key | 8 |
| vanta | legal, security, monitoring | client-credentials | 25 |
| vercel | devops, developer-tools | access-token, oauth2 | 28 |
| vimeo | video, social-media | access-token | 36 |
| webflow | cms | api-token, oauth2 | 14 |
| whatsapp | communication | access-token | 9 |
| wix | cms, crm, commerce | api-key | 24 |
| woocommerce | commerce | api-key | 13 |
| wordpress | cms | basic, oauth2 | 15 |
| workos | security, developer-tools | api-key | 23 |
| wufoo | forms, productivity | api-key | 8 |
| xero | finance | oauth2 | 13 |
| youtube | video, social-media | api-key, oauth2 | 16 |
| zendesk | support, crm | api-token, oauth2 | 17 |
| zoho | crm | oauth2 | 21 |
| zohomail | communication, email | oauth2 (×8 DCs) | 16 |
| zoom | video, communication | server-to-server, oauth2 | 14 |

246 apps, 4238 actions.

`upstash` and `supabase` are **not** raw Redis/Postgres — this pack's Apps run in a
network-less sandbox that only reaches the network via `ctx.fetch` over HTTP(S) to a
static, publish-time hostname allowlist, so a wire-protocol database (TCP, not HTTP)
cannot be reached at all. Upstash (Redis over a REST API) and Supabase (Postgres via
PostgREST's REST API) are the closest real, fixed-domain products that actually work
under this architecture — see each app's README for the scoping rationale.

Icons are the vendors' own marks — fetched from each vendor's own brand page,
favicon or web-app manifest, with n8n's `nodes-base` as the fallback mirror for
apps ported from it. Each app's README says exactly which file, from where, and
on what date, under `## Icon`.

**The vendor first, and the vendor's current mark.** A mirror can lag a rebrand
and a "simple icon" export can be a wordmark or a colourless silhouette, so a
mark is only as good as its source. Prefer, in order: the vendor's own brand
page; their `favicon.svg` or web-app-manifest icon; a mirror. Reject a
`safari-pinned-tab.svg` outright — it is a potrace-generated monochrome *mask*,
which is what Safari's pinned-tab slot requires and a poor app mark. Vector is
preferred, but a vendor that publishes no vector of its square mark is better
served by their largest raster (`appearance.icon.url`) than by a redraw: nothing
in this pack is drawn from scratch except the five exceptions listed below.

**One canvas, every app.** A host draws the mark into one small square tile, so
marks arrive pre-squared and pre-inset: `_tools/icon-normalize.ts` trims each
one to its true ink box and re-frames it on a square `0 0 100 100` canvas at a
fixed fraction of it, so nothing is squashed by a non-square aspect, nothing
kisses the tile's rounded corner, and optical weight is uniform across the pack.
The artwork is never touched — it is re-parented, verbatim, into a nested
`<svg>` whose viewBox is the measured ink box, which is the one re-frame that
survives `<style>` rules, `userSpaceOnUse` masks, gradients and `<use>`. Run it
after installing any new mark:

```bash
deno task icons:normalize   # from _tools/ — square + inset every icon
```

It needs `rsvg-convert` and ImageMagick; the file header says how to get them
into the `api` service. Re-running is safe — it unwraps its own output before
measuring, so a second pass reproduces the first.

**Both themes, every app.** A host draws the mark on a tile that flips with the
theme (`--w6w-icon-swatch` in `@w6w/ui`: `#f0f2f6` light, `#1f232c` dark), so a
one-colour black export — what most vendor "simple icon" downloads are — is
perfect in light mode and invisible in dark. An app whose mark cannot survive a
theme ships a second ImageObject under `appearance.darkMode.icon`
(`assets/icon.dark.svg`), which the host prefers when the theme is dark. Two
sanctioned forms, and which one an app takes is a brand question:

- **Reversed mark** — the same artwork re-inked to white, the treatment
  essentially every brand guide specifies for its own logo on a dark ground.
  The geometry is untouched; only the paint changes.
- **Plate** — a multicolour mark whose palette must not change is composed,
  verbatim, on the light backdrop its brand allows (via a nested `<svg>`).

`_tools/icon-legibility.ts` decides which apps need one and writes the reversed
form; the pack auditor fails an app that needs a variant and has none:

```bash
deno task icons        # from _tools/ — report every illegible mark
deno task icons:fix    # generate the reversed variants + declare them
```

An icon is judged illegible on a tile when none of its inks is separable from
it — ΔE (Lab) below 25, or sitting at the tile's own brightness (WCAG contrast
below 1.5) without a large colour difference to carry it.

Five exceptions, stated rather than buried. In each case n8n has no node for the
product and the vendor publishes no obtainable mark, so there was nothing to copy
verbatim. Where a colour is quoted below it *is* vendor-sourced — taken from the
vendor's own stylesheet, theme config or web manifest — even though the artwork is not.

- **`google-forms`** — follows the sibling Google icons' silhouette in Forms' brand
  purple, with a checklist glyph.
- **`odoo`** — n8n's `nodes-base` Odoo icon is itself a simplification (a single
  filled ring), not the vendor's own artwork. Ours is two rings in Odoo's brand
  purples (`#714B67`, `#875A7B`).
- **`manychat`** — the vendor's assets sit behind Cloudflare (403) and the one
  fetchable logo is a wordmark, unusable as a square icon. Ours is a chat bubble in
  `#3A46BD`, the `brand_color` from ManyChat's own help-centre theme.
- **`ticktick`** — a rounded square and checkmark in `#4772FA`, the `themeColor`
  from TickTick's own `developer.ticktick.com/docs/config.js`.
- **`circle`** — n8n has a CircleCI node, a different product. Ours is a ring with
  three satellites, in colours sampled from circle.so's own stylesheet.

Each app's own README says so too. Replace any of them if an official mark is ever
sourced.

## Health checks

Every app **declares** its health checks per [`rfcs/healthcheck.md`][health-rfc], so a host
runs what the publisher says to run instead of guessing at a probe. Each declares a
`service` check (is the vendor up?) and a `quota` check (is there headroom?) — as a real
probe where the vendor supports one, and as an explicit `unavailable` where it does not,
because "nothing exists to check" is a more useful answer than a gap. Twenty-three apps addressed
by a per-tenant host (ActiveCampaign, Databricks, Discourse, Elastic, Freshdesk, Freshservice,
Ghost, Grafana, Gravity Forms, Grist, Jenkins, Jira, Metabase, Odoo, ServiceNow, Shopify,
Snowflake, Strapi, Supabase, Upstash, WooCommerce, WordPress, Zendesk) add a `dependency`
check for the tenant's own site. Credential checks come free: the runtime derives an
`auth:<method>` check from each Auth `test` hook.

Status hosts stay off every app's main egress allowlist — a `service` check widens egress
for its own worker only, which is safe precisely because such a check is never signed.

Per-app detail, including why each probe was chosen over the obvious alternatives, is in
`apps/<app>/README.md`, indexed in [HEALTHCHECKS.md](HEALTHCHECKS.md).

[health-rfc]: https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md

## Layout

```
w6w-apps/
├── w6w-pack.json           # top-level pack manifest — the registry entry point
├── apps/                   # every App lives here
│   └── <app>/              # one dir per App
│       ├── README.md       # usage + health check (status, probe, quota)
│       ├── package.json    # manifest (w6w field)
│       ├── deno.json
│       ├── tsconfig.json
│       ├── index.ts
│       ├── assets/icon.{svg,png}
│       ├── assets/icon.dark.svg  # optional dark-theme variant (see Icons)
│       ├── auth/*.ts
│       ├── actions/*.ts
│       ├── health/*.ts      # declared health checks (service, quota, dependency)
│       ├── lib/*.ts
│       └── tests/
└── _tools/                 # scaffolding + porting helpers (not shipped)
```

## Contributing

Each app has a `deno.json` with local tasks:

```sh
cd apps/<app>
deno task test
deno task check
deno task lint
```

Before opening a PR, run the pack-wide conformance auditor from the repo root.
It validates every app against `core`'s own `@w6w/validator`, rebuilds each
manifest the way the runtime's loader does, and source-scans for the sandbox
rules that are only visible in code — global `fetch`, `Deno.*`, credentials
handled outside an auth `sign` hook, and hosts called but absent from
`w6w.network.allow`:

```sh
deno run --no-check -A _tools/audit.ts          # every app
deno run --no-check -A _tools/audit.ts slack    # one app
deno run --no-check -A _tools/audit.ts --json   # machine-readable
```

It exits non-zero on any error. Warnings flag optional-but-recommended
metadata (`output`, `idempotent`, a unit test per action).

Ship changes through a PR against `w6w-io/w6w-apps` from a personal fork —
never push directly to `main` here.

## Spec

- Pack manifest shape: `PackManifest` in `@w6w/types` (see `w6w-io/w6w-core`).
- Pack install mechanics: `registerPack()` in `@w6w/registry` (see
  `w6w-io/w6w-registry`).
