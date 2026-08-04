import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { RecordList } from "./record-list";

/**
 * What these pin down:
 *
 * A phone gets one row per record, two lines inside it, and the one number the
 * row is about on the right. That number used to be dropped entirely below
 * `sm` — every fact was `hidden sm:flex` — so converting the deals and leads
 * tables to this list would have shown a deal with no value at all, which is
 * less than the bordered card it replaced.
 *
 * These assert on the emitted markup rather than on the source, because the
 * previous round's untypeable `<input type="button">` typechecked, rendered,
 * and passed every test that only ever looked at the source.
 */
const ROWS = [
  {
    id: "deal-1",
    href: "/crm/deals/deal-1",
    title: "Aluminium shopfront",
    subtitle: "DL-0012 · Meikles Hotel",
    facts: [
      { label: "Value", value: "USD 12,400", mono: true },
      { label: "Owner", value: "Tendai" },
      { label: "Stage", value: "Quoted" },
    ],
  },
];

describe("RecordList facts", () => {
  it("shows the leading fact on a phone and hides the rest", () => {
    const html = renderToStaticMarkup(<RecordList rows={ROWS} />);

    // The mobile span: visible by default, hidden from `sm` up.
    expect(html).toContain("sm:hidden");
    // It carries the first fact's value…
    expect(html.match(/USD 12,400/g)).toHaveLength(2); // mobile span + desktop cluster
    // …and only the first: the other two live solely in the `sm:flex` cluster.
    expect(html.match(/Tendai/g)).toHaveLength(1);
    expect(html.match(/Quoted/g)).toHaveLength(1);
  });

  it("does not repeat the leading fact's label on a phone", () => {
    const html = renderToStaticMarkup(<RecordList rows={ROWS} />);
    // "Value" is a desktop column heading; the phone row has no room to
    // explain a number that is already the only one there.
    expect(html.match(/>Value</g)).toHaveLength(1);
  });

  it("keeps a row to two lines — title and subtitle, nothing else", () => {
    const html = renderToStaticMarkup(<RecordList rows={ROWS} />);
    expect(html).toContain("Aluminium shopfront");
    expect(html).toContain("DL-0012 · Meikles Hotel");
    // No card frame: rows are separated by whitespace, not borders.
    expect(html).not.toContain("card-radius");
  });

  it("renders nothing extra when a row has no facts", () => {
    const html = renderToStaticMarkup(
      <RecordList rows={[{ id: "a", href: "/a", title: "Plain" }]} />,
    );
    expect(html).not.toContain("sm:hidden");
  });
});
