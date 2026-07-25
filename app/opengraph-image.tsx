import { ImageResponse } from "next/og";

import { PLATFORM_BRAND_NAME, PLATFORM_MARKETING_DOMAIN } from "@/lib/platform/brand";
import { STARTING_MONTHLY_PRICE, TRIAL_DAYS, formatUsd } from "@/lib/marketing/pricing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${PLATFORM_BRAND_NAME} — business software built for Zimbabwe`;

/**
 * Social card for the marketing surface. Rendered at build/request time by
 * next/og, so it stays in sync with pricing without anyone re-exporting a PNG.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b1532 0%, #16255f 60%, #0d1a44 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "#ffffff",
              color: "#16255f",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            {PLATFORM_BRAND_NAME.slice(0, 1)}
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {PLATFORM_BRAND_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              maxWidth: 960,
            }}
          >
            Priced per site. Never per user.
          </div>
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 32, maxWidth: 900 }}>
            Stock, sales, staff, and cash in one system that works offline.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {[
            `From ${formatUsd(STARTING_MONTHLY_PRICE)}/month`,
            `${TRIAL_DAYS}-day free trial`,
            PLATFORM_MARKETING_DOMAIN,
          ].map((chip, index) => (
            <div
              key={chip}
              style={{
                display: "flex",
                borderRadius: 999,
                padding: "12px 26px",
                fontSize: 26,
                background: index === 0 ? "#ff6b35" : "rgba(255,255,255,0.1)",
                color: "#ffffff",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
