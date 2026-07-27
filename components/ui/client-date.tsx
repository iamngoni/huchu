"use client";

import { ClientDate, type ClientDateProps } from "@corelithzw/react";

/**
 * ClientDate — the design system's, re-exported under this repo's name.
 *
 * 39 files drop this inline inside table cells and text runs, so the migration
 * was gated on the DS version preserving both invariants the local copy had:
 *
 *   1. It returns a **bare fragment**, never a wrapper element — no `<span>`,
 *      no class hook — so it never disturbs the layout of the cell or sentence
 *      it sits in.
 *   2. Before mount it emits a **string slice of the raw ISO input**
 *      (`value.slice(0, 10)` for `date`, `value.slice(0, 16).replace('T', ' ')`
 *      for `datetime`). Nothing derived from `new Date()` reaches the first
 *      paint, so the server bytes and the first client render match and React
 *      hydration error #418 stays away. Only after the mount effect does it
 *      swap to `toLocaleDateString()` / `toLocaleString()`.
 *
 * `@corelithzw/react` ships both, byte for byte, so this is a straight
 * re-export rather than a reimplementation. The only widening is `fallback`,
 * which is `ReactNode` in the DS where it was `string` here.
 *
 * `"use client"` is load-bearing: the published DS bundle carries no client
 * directive of its own, so this module is what marks `ClientDate` — which uses
 * `useState`/`useEffect` — as a client reference for the server components that
 * import it.
 */
export { ClientDate };
export type { ClientDateProps };
