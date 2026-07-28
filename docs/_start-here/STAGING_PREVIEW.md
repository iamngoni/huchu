# Staging and preview deployments

A Vercel preview answers on one generated hostname —
`huchu-git-<branch>-<team>.vercel.app` — and this platform decides which
workspace you are in from that hostname. `floorcode.<root>` is the floorcode
workspace, `pos.floorcode.<root>` is its till, `<root>` is the marketing site.
A generated preview name is none of those, so out of the box a preview with
`PLATFORM_ROOT_DOMAIN` set refuses to sign anybody in (`TENANT_NOT_FOUND`) and
sends every authenticated page to `/access-blocked`.

The previous advice was to leave `PLATFORM_ROOT_DOMAIN` unset on previews. That
makes the deployment reachable, but it also switches off tenant routing, portal
hosts and host enforcement — so the preview is not testing what production
runs, and there is no way to say which tenant you want to be.

Instead, a preview may **nominate the host it should be treated as**.

## Setting it up on Vercel

On the Vercel project, in **Settings → Environment Variables**, scoped to
**Preview** (and to a Staging environment if you have one) — never Production:

| Variable | Value | What it does |
| --- | --- | --- |
| `PREVIEW_HOST_OVERRIDE` | `1` | Lets the deployment be told which host to behave as. |
| `PREVIEW_BYPASS_HOST_ENFORCEMENT` | `1` | Stops a host mismatch from bricking the deployment. Optional but recommended. |
| `PREVIEW_HOST_ALLOWLIST` | `pagka.dev` | Optional. Comma-separated host suffixes the override may name. Unset means any. |
| `PLATFORM_ROOT_DOMAIN` | `pagka.dev` | Same value as production, so tenant subdomains resolve the same way. |
| `DATABASE_URL` | staging database | **Not production.** Previews run migrations and seeds against whatever this points at. |
| `NEXTAUTH_SECRET` | any staging secret | |
| `NEXTAUTH_URL` | leave unset | Vercel sets the deployment URL; NextAuth follows it. |

Both flags are refused outright when `VERCEL_ENV` is `production`, so a variable
that leaks into the production env group cannot switch them on. Nominating your
own Host header is exactly what tenant enforcement exists to prevent.

## Using it

Open **`/preview-host`** on the deployment. It shows the real host, the host it
is being treated as, the tenant slug that resolves from it, and whether
enforcement is strict or bypassed — and it lets you change any of that. It is
reachable without a session and outside tenant routing, because it is the page
you need when routing is what is wrong.

From the address bar, any path accepts either parameter:

```
https://huchu-git-my-branch.vercel.app/login?__tenant=floorcode
https://huchu-git-my-branch.vercel.app/?__host=pos.floorcode.pagka.dev
https://huchu-git-my-branch.vercel.app/?__host=          # back to the real host
```

`?__tenant=` takes a slug and expands it against `PLATFORM_ROOT_DOMAIN`;
`?__host=` takes a whole host, portal prefix and all. The proxy stores the value
in an `HttpOnly` cookie and redirects to the clean URL, so the parameter never
reaches the page and never survives into a link you share or a `callbackUrl`.

For curl and for the e2e suite there is a header, which beats the cookie:

```bash
curl -H 'x-huchu-preview-host: floorcode.pagka.dev' https://…vercel.app/api/v2/crm/leads
```

Cross-host redirects — the tenant host, the portal hosts, the POS till host —
stay on the preview origin and switch the nominated host instead, because
`pos.floorcode.pagka.dev` has no DNS pointing at a preview build.

## Seeding a workspace

A staging database nobody has seeded is a sign-in page you cannot get past.

```bash
export DATABASE_URL=…staging…
npx tsx scripts/seed-staging-tenant.ts \
  --slug floorcode \
  --email james@floorcodezim.com \
  --password '…' \
  --name 'Floorcode Zimbabwe' \
  --user-name 'James'
```

This creates the tenant `ACTIVE` (a `PROVISIONING` tenant signs in and is then
turned away), creates one `SUPERADMIN`, assigns the top subscription tier and
enables every addon bundle. The tier is the lever that matters: entitlements are
computed from the in-code feature catalogue and a billable feature stays off
unless a tier or addon entitles it, so a `CompanyFeatureFlag` on its own does
nothing. The script refuses to run if `DATABASE_URL` looks like production.

## Running the same thing locally

```bash
DATABASE_URL=postgresql://…/huchu_staging \
NEXTAUTH_SECRET=dev-secret \
PLATFORM_ROOT_DOMAIN=pagka.dev \
PREVIEW_HOST_OVERRIDE=1 \
PREVIEW_BYPASS_HOST_ENFORCEMENT=1 \
  pnpm dev
```

Then send a Host header that is not localhost, or the loopback rule turns strict
enforcement off and you are not testing the same paths:

```bash
curl -H 'Host: preview.vercel.app' http://localhost:3000/preview-host?__tenant=floorcode
```

## What it does not change

The override replaces the host, and nothing else. Sign-in is still scoped to the
tenant that host resolves to, the session still carries that tenant's
`allowedHosts`, host enforcement still runs against the nominated host, and an
inactive tenant is still refused. That is the point — a preview that skipped
those checks would not be testing the build you are about to ship.
