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
        title="Answer the questions that make the demo useful."
        copy="The first conversion is not a blank ERP account. It is a short setup questionnaire that tells Corelith what to configure, what workflow to show and what implementation risk to discuss."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Setup questionnaire"
          title="Give us enough context to prepare a serious demo."
          copy="Industry, locations, people, current tools, problem area, timeline and preferred contact channel all change the right recommendation."
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
