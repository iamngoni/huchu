# Corelith Design System — AI reference

Audience: AI agents refactoring `tate2301/huchu` onto the Corelith DS. No human maintains this folder.
Written against `@corelithzw/react@0.3.0`, installed in this repo. Site: <https://design.corelith.co.zw>.

## Source-of-truth order

Resolve every question in this order. Higher wins on conflict — the website prose is aspirational in places and has been observed to be wrong.

| Rank | Source | Use it for |
|---|---|---|
| 1 | `node_modules/@corelithzw/react/dist/index.d.ts` | Exact React API: names, props, generics, compound slots |
| 2 | `node_modules/@corelithzw/react/dist/styles.css` | Exact tokens, class names, real markup contracts, breakpoints |
| 3 | This folder | Verified digest, migration mapping, invariants, what does/doesn't exist |
| 4 | `https://design.corelith.co.zw/**` | Composition guidance, worked recipes, prototypes — fetch on demand |

**Never restate a prop signature from memory.** Read it:

```bash
# props for one component
grep -A25 "interface ButtonProps" node_modules/@corelithzw/react/dist/index.d.ts
# does a class exist, and what does it require?
grep -n "\.status-dot" node_modules/@corelithzw/react/dist/styles.css
```

Observed conflict, as an example of why rank matters: the site's `p-accordion` page documents
`.accordion-item` / `.accordion-trigger` / `.accordion-content`. **None of those exist.** The shipped
`.accordion` styles native `<details>`/`<summary>`. Grep before you trust prose.

## Which file to load

Load only what the task needs. Do not read this folder end to end.

| File | Load when |
|---|---|
| `01-setup.md` | Wiring the package in, importing CSS, touching `app/globals.css`, hitting an RSC/hydration error |
| `02-tokens.md` | Choosing a colour, size, font, radius, shadow, duration, or breakpoint |
| `03-components.md` | Picking a component; checking whether one exists as React or CSS-only |
| `04-composition.md` | Building or restructuring a whole page, layout, or shell |
| `05-rules.md` | Writing copy, formatting values, a11y, z-index, motion — the merge-blocking contract |
| `06-reference-urls.md` | You want a worked example (61 recipes, 20 charts, 10 kits, 10 portals, 13 verticals) |
| `07-repo-migration.md` | Migrating a specific file under `components/`, `components/ui/`, or `app/` |

## Invariants — never violate

1. **No hard-coded values.** No hex, px, ms, or font stacks in new code. Token or nothing (`02-tokens.md`).
2. **One primary action per surface.** One `Button variant="primary"` / brand-blue element per page.
3. **Brand blue is action + focus only.** Never decoration.
4. **Borders at rest, shadows only when floating.** Resting cards get `--border`, never a shadow.
5. **Every DS component import needs `"use client"`.** The package ships no client directive; see `01-setup.md`.
6. **Never invent a class name.** Grep `styles.css` first; if absent, compose from primitives that do exist.
7. **Never invent a status label.** Exactly five: Needs input, Running, Completed, Idle, Not started.
8. **Ship the empty, loading, and error state** with every new data surface.
9. **`--space-8` and `--space-10` mean different sizes in this repo than in the DS.** Read the collision table in `01-setup.md` before touching spacing.
10. **The DS has no dark mode.** This repo does. Read `01-setup.md` before assuming either.

## Layer model

Four layers, prefix-coded. Pick the lowest that fits.

```
p-  primitive   one component                      → 03-components.md
b-  block       several components, fixed arrangement, no behavioural contract
x-  pattern     whole surface owning a state machine / URL scheme / keyboard contract
pg- page        fills the entire content area       → 04-composition.md
```

Decision tree: fills the content area → page. Else owns a state machine, URL convention, or keyboard
contract → pattern. Else more than one component in a specific arrangement → block. Else primitive.
When uncertain, build a block; promote to pattern only when a second use site needs the same contract.
