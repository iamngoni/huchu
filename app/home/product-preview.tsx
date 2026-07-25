"use client";

import { useState } from "react";

import { CheckCircle, TriangleAlert } from "@/lib/icons";
import { solutions } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";

const toneIcon = {
  neutral: CheckCircle,
  success: CheckCircle,
  warn: TriangleAlert,
};

export function ProductPreview({
  initialSlug = "commerce",
  compact = false,
}: {
  initialSlug?: string;
  compact?: boolean;
}) {
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const active = solutions.find((solution) => solution.slug === activeSlug) ?? solutions[0];
  const visual = active.productVisual;

  return (
    <aside
      className={`${styles.productPreview} ${compact ? styles.productPreviewCompact : ""}`}
      aria-label="Corelith product interface preview"
    >
      <div className={styles.previewHeader}>
        <div>
          <p className={styles.eyebrow}>{visual.eyebrow}</p>
          <h2 className={styles.cardTitle}>{visual.title}</h2>
        </div>
        <span className={styles.statusPill}>{visual.status}</span>
      </div>

      <div className={styles.previewTabs} role="tablist" aria-label="Product preview industry">
        {solutions.map((solution) => {
          const Icon = solution.icon;
          const selected = solution.slug === active.slug;

          return (
            <button
              key={solution.slug}
              type="button"
              aria-selected={selected}
              className={`${styles.previewTab} ${selected ? styles.previewTabActive : ""}`}
              onClick={() => setActiveSlug(solution.slug)}
              role="tab"
            >
              <Icon className={styles.icon} weight="regular" />
              {solution.navTitle}
            </button>
          );
        })}
      </div>

      <div className={styles.previewBody}>
        <div className={styles.metricGrid}>
          {visual.metrics.map((metric) => (
            <div key={metric.label} className={styles.metricTile}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
              <p>{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className={styles.previewColumns}>
          <div className={styles.previewList}>
            {visual.primaryRows.map((row) => (
              <div key={row.label} className={styles.previewRow}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
                <p>{row.meta}</p>
              </div>
            ))}
          </div>

          <div className={styles.previewList}>
            {visual.secondaryRows.map((row) => {
              const Icon = toneIcon[row.tone];

              return (
                <div key={row.label} className={styles.statusRow}>
                  <Icon className={styles.icon} weight="regular" />
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
