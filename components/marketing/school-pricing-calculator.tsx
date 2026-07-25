"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ArrowRight } from "@/lib/icons";
import {
  MONTHS_PER_TERM,
  SCHOOL_GROUP_INDICATIVE_PER_STUDENT_PER_TERM,
  TERMS_PER_YEAR,
  buildSchoolQuote,
  formatUsd,
} from "@/lib/marketing/pricing";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing-site.module.css";

const MIN_STUDENTS = 50;
const MAX_STUDENTS = 2000;
const STEP = 25;

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function SchoolPricingCalculator() {
  const [students, setStudents] = useState(450);
  const quote = useMemo(() => buildSchoolQuote(students), [students]);

  return (
    <div className={styles.pricingEstimator}>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <label htmlFor="enrolment" className={styles.stripeEyebrow}>
            How many students do you have?
          </label>

          <p className="mt-3 text-[2.6rem] font-bold leading-none tracking-[-0.05em] text-[#0b1945]">
            {students.toLocaleString("en-US")}
            {students >= MAX_STUDENTS ? "+" : ""}
            <span className="ml-2 text-base font-medium text-[#7383a9]">students</span>
          </p>

          <input
            id="enrolment"
            type="range"
            min={MIN_STUDENTS}
            max={MAX_STUDENTS}
            step={STEP}
            value={students}
            onChange={(event) => setStudents(Number(event.target.value))}
            aria-describedby="enrolment-help"
            className="mt-6 w-full accent-[#ff6b35]"
          />

          <div className="mt-2 flex justify-between text-xs text-[#7383a9]">
            <span>{MIN_STUDENTS}</span>
            <span>{MAX_STUDENTS.toLocaleString("en-US")}+</span>
          </div>

          <p id="enrolment-help" className="mt-4 text-sm leading-6 text-[#31436f]/80">
            Drag to your enrolment. Pricing is per campus, per term — there are{" "}
            {TERMS_PER_YEAR} terms a year. Staff accounts are unlimited on every band.
          </p>
        </div>

        <div className="rounded-[18px] border border-[#d6def5] bg-[#f7f9ff] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7383a9]">
            Your band
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-[#0f1f55]">
            {quote.band.name}
          </p>

          {quote.isCustom ? (
            <>
              <p className="mt-5 text-[2rem] font-bold leading-none tracking-[-0.04em] text-[#0b1945]">
                Let&rsquo;s talk
              </p>
              <p className="mt-3 text-sm leading-6 text-[#31436f]/82">
                Above 1,500 students we quote per campus. Group pricing is indicatively around{" "}
                {formatMoney(SCHOOL_GROUP_INDICATIVE_PER_STUDENT_PER_TERM)} per student per term —
                cheaper per student than any published band.
              </p>
            </>
          ) : (
            <>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[2.4rem] font-bold leading-none tracking-[-0.05em] text-[#0b1945]">
                  {formatUsd(quote.termTotal ?? 0)}
                </span>
                <span className="text-sm text-[#7383a9]">/ term</span>
              </div>

              <dl className="mt-5 space-y-2.5 border-t border-[#d6def5] pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[#31436f]/80">Per student, per term</dt>
                  <dd className="font-semibold text-[#0b1945]">
                    {formatMoney(quote.perStudentPerTerm ?? 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[#31436f]/80">Monthly equivalent</dt>
                  <dd className="font-semibold text-[#0b1945]">
                    {formatUsd(quote.monthlyEquivalent ?? 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[#31436f]/80">Full year ({TERMS_PER_YEAR} terms)</dt>
                  <dd className="font-semibold text-[#0b1945]">
                    {formatUsd((quote.termTotal ?? 0) * TERMS_PER_YEAR)}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-5 text-[#7383a9]">
                Each term is about {MONTHS_PER_TERM} months. Prices exclude optional add-ons.
              </p>
            </>
          )}

          <Button asChild className="mt-6 w-full rounded-full">
            <Link href={`/home/book-demo?plan=schools&students=${students}`}>
              {quote.isCustom ? "Request a group quote" : "Book a school demo"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
