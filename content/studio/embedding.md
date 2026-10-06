---
key: "embedding"
title: "Embed Studio in your product"
section: "studio"
description: "Put the real Studio inside an iframe in your own product, signed in as your own user, with your chrome around it instead of Studio's."
format: "markdown"
shared: true
order: 200
position: 29
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/embedding.md"
sourceSha: "9402cab4f903169797c7407eaa79058c81ece7e5"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/embedding.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Embed Studio in your product

If you run a product on top of W6W, your users can work in Studio without leaving it. You load
Studio in an `<iframe>`, hand it a session token for the user who is signed in to your product, and
Studio opens already signed in, scoped to that user's account. You choose how much of Studio's own
chrome shows: all of it, a trimmed version, or only the content pane inside your own navigation.

This page is for the developer wiring the embed. If you'd rather build your own screens on the API,
use the SDKs instead: see [Node SDK](/clients/node/).

## Before you start

- A W6W tenant with your identity provider registered for it (OIDC). Your users' tokens, signed by
  your provider, are what Studio signs in with. Ask your W6W contact to register the issuer, the
  public key set (JWKS) URL, and, if you map each of your organisations to its own W6W account, the
  claim that names the organisation.
- Your Studio URL (`https://<your-studio-host>`) and your API URL (`https://<your-api-host>`).
- A server-side place in your product that can mint a token for the signed-in user. Never mint
  tokens in the browser.

## 1. Mint a token for the signed-in user

On your server, sign a JWT for the current user with your identity provider's key. It needs your
registered `iss`, the user's id in `sub` (or the claim you registered instead), and, if you use
one, your organisation claim. Give it a short lifetime, for example one hour.

How you know it worked: calling the API with it answers, not `401`.

```bash
export W6W_TOKEN=…   # the token your server just minted
curl -H "Authorization: Bearer $W6W_TOKEN" "https://<your-api-host>/auth/me"
```

## 2. Point an iframe at Studio with the token in the fragment

Put the token and your API origin in the URL **fragment** (after `#`), not the query string. A
fragment is never sent to a server, and Studio removes it from the address bar as soon as it has
read it.

```html
<iframe
  src="https://<your-studio-host>/#session=<token>&api=https%3A%2F%2F<your-api-host>&embedded=1"
  style="width: 100%; height: 100%; border: 0"
></iframe>
```

URL-encode every value. How you know it worked: the frame opens on the account's **Dashboard**,
with no sign-in screen.

You can open on a specific screen by adding its path before the `#`, without knowing any W6W
project id: `https://<your-studio-host>/workflows#session=…`. Studio fills in the account's current
project and keeps the rest of the path, so `/functions/<function-id>` lands on that Function.

### Fragment parameters

| Parameter | What it does |
| --- | --- |
| `session` | Required. The bearer token Studio signs in with. Anything your API accepts works. |
| `api` | The API origin the token is valid for, as an absolute `https://` URL. Leave it out only if the Studio build already points at the right API. |
| `user` | The name shown for the signed-in user. Defaults to the token's `sub`. |
| `embedded` | `1` tells Studio it's embedded. It also detects being inside an iframe on its own, so this mainly matters for a full-page takeover or a same-origin frame. |
| `brand` | Replaces the "w6w studio" wordmark with your own name. The first word is bold and the rest muted, for example `brand=Acme%20Automations`. |
| `hideProjects` | `1` hides the project switcher, for users who only ever have one project. |
| `contentOnly` | `1` hides Studio's top bar and left navigation completely, leaving only the page content. See step 4. |
| `bg` | A CSS colour for the page background, or `transparent` to let your own page show through. Cards and panels keep their own colour. |
| `theme` | `light` or `dark`. Forces Studio's theme instead of the visitor's own preference. It doesn't change the theme they chose for normal visits. |

Every launch fully defines the session: a parameter you leave out is cleared, not inherited from a
previous launch in the same browser.

Studio keeps these settings in the browser's local storage for its own origin, so they survive a
reload inside the frame.

## 3. Know what changes when Studio is embedded

Embedded, Studio removes what belongs to your product rather than to the work itself:

- The top bar's **Upgrade** button, GitHub link and theme toggle are gone.
- **Settings** (project, billing, API tokens, team) and the account chip with **Log out** are gone
  from the sidebar. Account administration stays in your product or in a direct Studio visit.
- The "add a passkey" prompt never appears, because the user never signed in through Studio.

The brand and the project switcher stay unless you pass `brand` or `hideProjects`. The right-hand
tool rail stays in every mode.

## 4. Optional: use your own navigation (`contentOnly=1`)

With `contentOnly=1`, your product draws the navigation and Studio draws only the page.

1. Fetch `https://<your-studio-host>/embed-nav.json`. It lists Studio's navigation groups, each
   entry's `key` and its on-screen `title`, exactly as Studio's own sidebar uses them:

   ```json
   [
     { "heading": "Observe", "entries": [{ "key": "dashboard", "title": "Dashboard" }] },
     { "heading": "Connect", "entries": [{ "key": "connections", "title": "Integrations" }] }
   ]
   ```

   The file is public metadata. If your product is on another origin, your Studio host must serve
   it with an `Access-Control-Allow-Origin` header your product is allowed by.
2. Build your rail from it, and load the first page as the iframe `src`, for example
   `https://<your-studio-host>/workflows#session=…&contentOnly=1`.
3. When the user clicks another entry, post a message to the frame instead of changing its `src`:

   ```js
   frame.contentWindow.postMessage({ type: "w6w:navigate", key: "functions" }, "https://<your-studio-host>");
   ```

   Studio changes page in place, without a reload, so the user keeps their session and scroll state.

How you know it worked: clicking an entry in your rail swaps the page inside the frame, and the
frame doesn't flash white or reload.

> **Good to know:** keep the iframe in a part of your page that stays mounted across your own
> route changes (a layout, not a per-route page). If your router remounts the component holding the
> iframe on every navigation, Studio reloads each time and the `w6w:navigate` message has nothing to
> arrive at.

Studio accepts `w6w:navigate` and `w6w:session` messages only from the page that embedded it (the
origin of `document.referrer`). Messages from any other origin are ignored.

## 5. Keep the session alive

The token in `#session=` is read once, when the frame loads. When you mint a replacement before
the old one expires, push it into the running frame; don't rebuild the `src`, which would reload
Studio and lose the user's place.

```js
frame.contentWindow.postMessage({ type: "w6w:session", token: newToken }, "https://<your-studio-host>");
```

Studio swaps the token in place. If a request does fail with `401` while embedded, Studio posts
`{ type: "w6w:session-expired" }` to your page and waits 8 seconds for a `w6w:session` reply before
it signs out. Listen for it and answer with a fresh token:

```js
window.addEventListener("message", async (event) => {
  if (event.origin !== "https://<your-studio-host>") return;
  if (event.data?.type === "w6w:session-expired") {
    const token = await mintTokenOnYourServer();
    frame.contentWindow.postMessage({ type: "w6w:session", token }, "https://<your-studio-host>");
  }
});
```

Refresh a little before expiry, and again when a background tab becomes visible: browsers delay
timers in background tabs, so a refresh scheduled an hour ahead can fire late.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| The frame shows Studio's sign-in page | The token expired or was rejected, and no `w6w:session` reply arrived within 8 seconds. | Answer `w6w:session-expired`, and refresh the token before it expires. Check the token against `/auth/me` as in step 1. |
| Every call in the frame returns `401` | `api` is missing, mistyped or not URL-encoded, so Studio is calling a different server than the token is for. | Pass `api` as an absolute, encoded `https://` origin. |
| Two of your organisations see the same data | Tokens don't carry the organisation claim, so every user lands in your tenant's default account. | Add the registered organisation claim to every token. |
| `w6w:navigate` does nothing | The message was posted from a different origin than the page that loaded the frame, or the `key` isn't one from `embed-nav.json`. | Post from the embedding page, with a key from the file. |
| Your rail can't fetch `embed-nav.json` | The Studio host doesn't send a CORS header for it. | Allow your product's origin on that file. |
| A `401` signs the user out at once, and `w6w:navigate` is ignored | Your page sends no referrer (for example `Referrer-Policy: no-referrer`), so Studio doesn't know your origin and won't exchange messages with it. | Send at least the origin as referrer, for example `Referrer-Policy: strict-origin-when-cross-origin`, or `referrerpolicy="origin"` on the iframe. |

## Where to next

- **[Studio overview](/studio/overview/)**: what each screen your users can reach is for.
- **[Node SDK](/clients/node/)**: build your own screens instead of embedding Studio's.
- **[API tokens](/studio/settings/tokens/)**: tokens for servers and scripts, rather than for people.
