import type { Metadata } from "next";

import { DemoRequestForm } from "@/app/home/book-demo/demo-request-form";
import {
  JsonLd,
  PageHero,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { seoPages, setupQuestions } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
} from "@/lib/marketing/seo";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildMarketingMetadata(seoPages.bookDemo);

export default async function BookDemoPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const rawInterest = params.interest ?? params.product ?? params.plan;
  const initialInterest = Array.isArray(rawInterest) ? rawInterest[0] : rawInterest;

  return (
    <SiteChrome>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/home" },
          { name: "Find your setup", path: "/home/book-demo" },
        ])}
      />
      <PageHero
        eyebrow="Find your Corelith setup"
        title="Twelve questions, and the demo is about your business."
        copy="We would rather spend twenty minutes preparing than waste an hour of yours clicking through a blank system. Tell us what you run and the demo opens on your workflow, with your kind of data in it."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Setup questionnaire"
          title="Enough context to give you a straight recommendation."
          copy="Business type, locations, headcount, current tools, the problem and your timing all change what we would actually recommend — including telling you when we are not the right fit."
        />
        <div className={styles.demoLayout}>
          <DemoRequestForm initialInterest={initialInterest} />
          <aside className={styles.notePanel}>
            <p className={styles.eyebrow}>What this captures</p>
            <ul className={styles.checkList}>
              {setupQuestions.map((question) => (
                <li key={question}>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </SiteChrome>
  );
}
