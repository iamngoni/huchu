import Link from "next/link";
import type { ReactNode } from "react";

import {
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from "@/lib/icons";
import {
  PLATFORM_BRAND_INITIAL,
  PLATFORM_BRAND_NAME,
} from "@/lib/platform/brand";
import { ProductPreview } from "@/app/home/product-preview";
import {
  companyPrinciples,
  connectedOutcomes,
  contactChannels,
  coreModules,
  faqs,
  footerGroups,
  foundingPartnerItems,
  launchSprintSteps,
  launchTargets,
  navItems,
  pricingPrinciples,
  primarySolution,
  problemFragments,
  proofFrames,
  solutions,
  type MarketingSolution,
} from "@/app/home/site-data";
import {
  LAUNCH_SPRINT_COPY,
  LAUNCH_SPRINT_DAYS,
  MARKETING_ADD_ONS,
  MARKETING_TIERS,
  SCHOOL_PRICING_BANDS,
  SCHOOL_STARTING_TERM_PRICE,
  STARTING_MONTHLY_PRICE,
  formatUsd,
  productPriceLabel,
} from "@/lib/marketing/pricing";
import styles from "@/app/home/marketing.module.css";

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className={styles.site}>
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}

export function MarketingNav() {
  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} aria-label={`${PLATFORM_BRAND_NAME} home`}>
          <span className={styles.brandMark}>{PLATFORM_BRAND_INITIAL}</span>
          <span>{PLATFORM_BRAND_NAME}</span>
        </Link>

        <nav className={styles.navLinks} aria-label="Marketing navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.navActions}>
          <Link href="/login" className={styles.quietLink}>
            Sign in
          </Link>
          <Link href="/home/book-demo" className={`${styles.button} ${styles.buttonPrimary}`}>
            Find your setup
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.brand} aria-label={`${PLATFORM_BRAND_NAME} home`}>
            <span className={styles.brandMark}>{PLATFORM_BRAND_INITIAL}</span>
            <span>{PLATFORM_BRAND_NAME}</span>
          </Link>
          <p className={styles.body}>
            Industry-ready business software built by Hurudza Labs in Zimbabwe for growing African businesses.
          </p>
        </div>

        <div className={styles.footerGrid}>
          {footerGroups.map((group) => (
            <nav key={group.title} className={styles.footerGroup} aria-label={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}

export function Announcement() {
  return (
    <div className={styles.announce}>
      <div className={styles.announceInner}>
        <span>Founding Partner Programme is open for selected trade and workshop businesses.</span>
        <Link href="/home/founding-partner">Check eligibility</Link>
      </div>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <section className={styles.pageHero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.display}>{title}</h1>
        <p className={styles.lead}>{copy}</p>
        {children}
      </div>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className={styles.sectionIntro}>
      <div className={styles.stack}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {copy ? <p className={styles.lead}>{copy}</p> : null}
    </div>
  );
}

export function HomeHero() {
  return (
    <>
      <Announcement />
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Business software for formalising trade companies in Zimbabwe</p>
          <h1 className={styles.display}>Your business, finally connected.</h1>
          <p className={styles.lead}>
            Corelith connects sales, stock, invoices, customers, finance and teams in one clear system,
            configured around your industry and implemented locally.
          </p>
          <div className={styles.buttonRow}>
            <Link href="/home/book-demo" className={`${styles.button} ${styles.buttonPrimary}`}>
              Find your Corelith setup
              <ArrowRight className={styles.icon} weight="regular" />
            </Link>
            <Link href="/home/solutions/commerce" className={styles.button}>
              See commerce setup
            </Link>
          </div>
          <div className={styles.assuranceGrid}>
            <span>Built in Zimbabwe</span>
            <span>Trade-led launch</span>
            <span>From {formatUsd(STARTING_MONTHLY_PRICE)}/month plus scoped onboarding</span>
          </div>
        </div>
        <ProductPreview />
      </section>
    </>
  );
}

export function ProblemSection() {
  return (
    <section className={styles.section}>
      <SectionIntro
        eyebrow="The operating problem"
        title="Your business should not depend on five spreadsheets and one person who knows where everything is."
        copy="Growing trade businesses do not fail because they lack another app. They lose money because the daily operating picture is split across chats, sheets, paper, a POS screen, accounting software and staff memory."
      />

      <div className={styles.problemGrid}>
        <div className={styles.problemSources}>
          {problemFragments.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className={styles.compactCard}>
                <Icon className={styles.cardIcon} weight="regular" />
                <h3 className={styles.cardTitle}>{item.label}</h3>
                <p className={styles.body}>{item.copy}</p>
              </article>
            );
          })}
        </div>

        <div className={styles.outcomePanel}>
          <p className={styles.eyebrow}>Corelith replaces the drift with</p>
          <div className={styles.outcomeList}>
            {connectedOutcomes.map((outcome) => (
              <div key={outcome} className={styles.outcomeItem}>
                <Check className={styles.icon} weight="regular" />
                <span>{outcome}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SolutionCards() {
  return (
    <div className={styles.solutionGrid}>
      {solutions.map((solution, index) => {
        const Icon = solution.icon;

        return (
          <Link
            key={solution.slug}
            href={`/home/solutions/${solution.slug}`}
            className={`${styles.solutionCard} ${index === 0 ? styles.solutionCardPrimary : ""}`}
          >
            <div className={styles.cardTopline}>
              <Icon className={styles.cardIcon} weight="regular" />
              <span>{solution.strategicRole}</span>
            </div>
            <p className={styles.eyebrow}>{solution.eyebrow}</p>
            <h3 className={styles.cardTitle}>{solution.headline}</h3>
            <p className={styles.body}>{solution.summary}</p>
            <span className={styles.inlineAction}>
              {solution.cta}
              <ChevronRight className={styles.icon} weight="regular" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function SolutionsSection() {
  return (
    <section className={styles.section}>
      <SectionIntro
        eyebrow="Choose the business you run"
        title="The launch site leads with trade because that is where the pain is sharpest."
        copy="Retail, wholesale and spare-parts businesses are the primary wedge. Workshops and auto operations sit close to the same stock, invoicing and customer rail. Schools stay on a separate enterprise path."
      />
      <SolutionCards />
    </section>
  );
}

export function WorkflowProofSection() {
  return (
    <section className={styles.section}>
      <SectionIntro
        eyebrow="Workflow proof"
        title="Corelith does not arrive empty."
        copy="Generic software gives you modules and leaves your team to translate them. Corelith starts with practical workflows, then connects the modules around them."
      />
      <div className={styles.workflowGrid}>
        {solutions.map((solution) => (
          <article key={solution.slug} className={styles.workflowCard}>
            <p className={styles.eyebrow}>{solution.title}</p>
            <h3 className={styles.cardTitle}>{solution.workflow.join(" -> ")}</h3>
            <Workflow steps={solution.workflow} />
          </article>
        ))}
      </div>
    </section>
  );
}

export function ModuleGrid() {
  return (
    <div className={styles.moduleGrid}>
      {coreModules.map((module) => {
        const Icon = module.icon;

        return (
          <article key={module.name} className={styles.moduleCard}>
            <Icon className={styles.cardIcon} weight="regular" />
            <h3 className={styles.cardTitle}>Corelith {module.name}</h3>
            <p className={styles.body}>{module.copy}</p>
            <div className={styles.connection}>
              <p>{module.connection}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ModulesSection() {
  return (
    <section className={styles.band}>
      <div className={styles.section}>
        <SectionIntro
          eyebrow="Connected platform"
          title="Every part of the business works together."
          copy="The modules are not separate product brands. Sell, Stock, Books and People are the connected parts of one operating system."
        />
        <ModuleGrid />
      </div>
    </section>
  );
}

export function Workflow({ steps }: { steps: string[] }) {
  return (
    <ol className={styles.workflow}>
      {steps.map((step, index) => (
        <li key={`${step}-${index}`} className={styles.workflowStep}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}

export function LaunchSprintSection() {
  return (
    <section className={styles.section}>
      <SectionIntro
        eyebrow={`${LAUNCH_SPRINT_DAYS}-day Launch Sprint`}
        title="We do not hand you software and disappear."
        copy={LAUNCH_SPRINT_COPY}
      />

      <div className={styles.stepGrid}>
        {launchSprintSteps.map((step) => {
          const Icon = step.icon;

          return (
            <article key={step.title} className={styles.stepCard}>
              <Icon className={styles.cardIcon} weight="regular" />
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.body}>{step.copy}</p>
            </article>
          );
        })}
      </div>

      <div className={styles.statStrip}>
        {launchTargets.map((target) => (
          <div key={target.value} className={styles.statTile}>
            <strong>{target.value}</strong>
            <span>{target.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PricingCards({ limit }: { limit?: number }) {
  const tiers = typeof limit === "number" ? MARKETING_TIERS.slice(0, limit) : MARKETING_TIERS;

  return (
    <div className={styles.pricingGrid}>
      {tiers.map((tier) => (
        <article
          key={tier.code}
          className={`${styles.priceCard} ${tier.isMostPopular ? styles.priceCardFeatured : ""}`}
        >
          <div className={styles.priceHeader}>
            <p className={styles.eyebrow}>{tier.tagline}</p>
            {tier.isMostPopular ? <span className={styles.statusPill}>Recommended</span> : null}
          </div>
          <h3 className={styles.priceTitle}>{tier.name}</h3>
          <p className={styles.price}>{formatUsd(tier.monthlyPrice)}/mo</p>
          <p className={styles.body}>{tier.bestFor}</p>
          <ul className={styles.checkList}>
            {tier.highlights.slice(0, 4).map((highlight) => (
              <li key={highlight}>
                <Check className={styles.icon} weight="regular" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
          <Link
            href={tier.ctaHref}
            className={`${styles.button} ${tier.isMostPopular ? styles.buttonPrimary : ""}`}
          >
            {tier.ctaLabel}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function PricingPreviewSection() {
  return (
    <section className={styles.section}>
      <SectionIntro
        eyebrow="Pricing"
        title="Clear monthly pricing, with setup treated honestly."
        copy="Corelith should not race free POS tools to zero. The monthly price stays accessible, while onboarding protects the quality of migration, training and go-live support."
      />
      <PricingCards limit={3} />
      <div className={styles.principlePanel}>
        <p className={styles.eyebrow}>Commercial rules</p>
        <ul className={styles.checkList}>
          {pricingPrinciples.map((principle) => (
            <li key={principle}>
              <Check className={styles.icon} weight="regular" />
              <span>{principle}</span>
            </li>
          ))}
        </ul>
        <Link href="/home/pricing" className={styles.inlineAction}>
          View full pricing
          <ArrowRight className={styles.icon} weight="regular" />
        </Link>
      </div>
    </section>
  );
}

export function AddOnTable() {
  return (
    <div className={styles.tableFrame}>
      <table className={styles.table}>
        <caption className="sr-only">Corelith add-on pricing</caption>
        <thead>
          <tr>
            <th scope="col">Add-on</th>
            <th scope="col">Category</th>
            <th scope="col">Monthly</th>
            <th scope="col">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {MARKETING_ADD_ONS.map((addOn) => (
            <tr key={addOn.code}>
              <th scope="row">{addOn.name}</th>
              <td>{addOn.category}</td>
              <td>{formatUsd(addOn.monthlyPrice)}</td>
              <td>{addOn.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SchoolBands() {
  return (
    <div className={styles.pricingGrid}>
      {SCHOOL_PRICING_BANDS.map((band) => (
        <article key={band.code} className={styles.priceCard}>
          <p className={styles.eyebrow}>
            {band.maxStudents === null ? "Custom enrolment" : `Up to ${band.maxStudents} students`}
          </p>
          <h3 className={styles.priceTitle}>{band.name}</h3>
          <p className={styles.price}>
            {band.termPrice === null ? "Tailored" : `${formatUsd(band.termPrice)}/term`}
          </p>
          <p className={styles.body}>{band.summary}</p>
        </article>
      ))}
    </div>
  );
}

export function ProofSection() {
  return (
    <section className={styles.section}>
      <SectionIntro
        eyebrow="Proof framework"
        title="No fake testimonials. Measure the operational change."
        copy="Until real case studies are ready, the site should frame proof around measurable business outcomes that buyers can recognise and that Corelith can later document honestly."
      />
      <div className={styles.cardGrid3}>
        {proofFrames.map((frame) => {
          const Icon = frame.icon;

          return (
            <article key={frame.title} className={styles.card}>
              <Icon className={styles.cardIcon} weight="regular" />
              <p className={styles.eyebrow}>{frame.metric}</p>
              <h3 className={styles.cardTitle}>{frame.title}</h3>
              <p className={styles.body}>{frame.copy}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CtaBand({
  title = "Find the Corelith setup that matches your business.",
  copy = "Answer a short questionnaire so the demo starts from your industry, locations, current tools and biggest operational problem.",
  href = "/home/book-demo",
  label = "Find your setup",
}: {
  title?: string;
  copy?: string;
  href?: string;
  label?: string;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.ctaPanel}>
        <div className={styles.sectionIntro}>
          <div className={styles.stack}>
            <p className={styles.eyebrow}>Next step</p>
            <h2 className={styles.sectionTitle}>{title}</h2>
          </div>
          <div className={styles.stack}>
            <p className={styles.lead}>{copy}</p>
            <Link href={href} className={`${styles.button} ${styles.buttonPrimary}`}>
              {label}
              <ArrowRight className={styles.icon} weight="regular" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactChannelGrid() {
  return (
    <div className={styles.cardGrid3}>
      {contactChannels.map((channel) => {
        const Icon = channel.icon;

        return (
          <article key={channel.title} className={styles.card}>
            <Icon className={styles.cardIcon} weight="regular" />
            <p className={styles.eyebrow}>{channel.title}</p>
            <h2 className={styles.cardTitle}>{channel.value}</h2>
            <p className={styles.body}>{channel.copy}</p>
            <Link
              href={channel.href}
              target={channel.external ? "_blank" : undefined}
              rel={channel.external ? "noreferrer" : undefined}
              className={styles.inlineAction}
            >
              Start here
              {channel.external ? (
                <ExternalLink className={styles.icon} weight="regular" />
              ) : (
                <ArrowRight className={styles.icon} weight="regular" />
              )}
            </Link>
          </article>
        );
      })}
    </div>
  );
}

export function CompanyPrinciples() {
  return (
    <div className={styles.cardGrid2}>
      {companyPrinciples.map((principle) => {
        const Icon = principle.icon;

        return (
          <article key={principle.title} className={styles.card}>
            <Icon className={styles.cardIcon} weight="regular" />
            <h2 className={styles.cardTitle}>{principle.title}</h2>
            <p className={styles.body}>{principle.copy}</p>
          </article>
        );
      })}
    </div>
  );
}

export function FoundingPartnerList() {
  return (
    <div className={styles.card}>
      <ul className={styles.checkList}>
        {foundingPartnerItems.map((item) => (
          <li key={item}>
            <Check className={styles.icon} weight="regular" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FAQGrid() {
  return (
    <div className={styles.cardGrid2}>
      {faqs.map((faq) => (
        <article key={faq.q} className={styles.card}>
          <h2 className={styles.cardTitle}>{faq.q}</h2>
          <p className={styles.body}>{faq.a}</p>
        </article>
      ))}
    </div>
  );
}

export function SolutionDetail({ solution }: { solution: MarketingSolution }) {
  const Icon = solution.icon;
  const whatsappHref = `https://wa.me/263784939111?text=${encodeURIComponent(solution.whatsapp)}`;

  return (
    <SiteChrome>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <Icon className={styles.heroIcon} weight="regular" />
          <p className={styles.eyebrow}>{solution.eyebrow}</p>
          <h1 className={styles.display}>{solution.headline}</h1>
          <p className={styles.lead}>{solution.summary}</p>
          <p className={styles.body}>{solution.audience}</p>
          <div className={styles.buttonRow}>
            <Link
              href={`/home/book-demo?interest=${solution.slug}`}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              {solution.cta}
              <ArrowRight className={styles.icon} weight="regular" />
            </Link>
            <Link href={whatsappHref} className={styles.button} target="_blank" rel="noreferrer">
              WhatsApp sales
              <ExternalLink className={styles.icon} weight="regular" />
            </Link>
          </div>
        </div>
        <ProductPreview initialSlug={solution.slug} compact />
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Pressure"
          title="Where the business case usually shows up."
          copy="The best buyer is not shopping for software in the abstract. They are trying to stop operational leakage that is already costing time, money or control."
        />
        <div className={styles.cardGrid2}>
          {solution.pains.map((pain) => (
            <article key={pain} className={styles.card}>
              <ShieldCheck className={styles.cardIcon} weight="regular" />
              <p className={styles.body}>{pain}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Prepared workflow"
            title="The demo starts from the way this business actually runs."
            copy="The point is not to show every module. It is to show the operational motion from first action to reporting."
          />
          <Workflow steps={solution.workflow} />
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Capabilities"
          title="What the configured setup covers."
          copy="Each solution uses the same Corelith base, then adds the workflows and language this business needs."
        />
        <div className={styles.cardGrid2}>
          {solution.capabilities.map((capability) => {
            const CapabilityIcon = capability.icon;

            return (
              <article key={capability.title} className={styles.card}>
                <CapabilityIcon className={styles.cardIcon} weight="regular" />
                <h3 className={styles.cardTitle}>{capability.title}</h3>
                <p className={styles.body}>{capability.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Commercial anchor"
          title="The pricing conversation stays visible before the proposal."
          copy="A tailored demo should not hide the commercial shape. The plan, setup scope and first workflow are discussed early."
        />
        <div className={styles.commercialPanel}>
          <div>
            <p className={styles.eyebrow}>Starting point</p>
            <p className={styles.price}>{productPriceLabel(solution.pricingSlug) ?? "Tailored"}</p>
            <p className={styles.body}>
              Schools start from {formatUsd(SCHOOL_STARTING_TERM_PRICE)}/term on a separate track.
            </p>
          </div>
          <div className={styles.tagList}>
            {solution.modules.map((module) => (
              <span key={module}>{module}</span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Expected outcomes"
          title="What the first rollout should make easier."
        />
        <div className={styles.cardGrid3}>
          {solution.outcomes.map((outcome) => (
            <article key={outcome} className={styles.compactCard}>
              <Check className={styles.cardIcon} weight="regular" />
              <p className={styles.cardTitle}>{outcome}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaBand
        href={`/home/book-demo?interest=${solution.slug}`}
        label={solution.cta}
        title={`Prepare a ${solution.title.toLowerCase()} demo around your actual workflow.`}
      />
    </SiteChrome>
  );
}

export function PrimarySolutionNote() {
  return (
    <div className={styles.notePanel}>
      <p className={styles.eyebrow}>Launch priority</p>
      <h2 className={styles.cardTitle}>{primarySolution.headline}</h2>
      <p className={styles.body}>
        The site leads with commerce because trade businesses feel stock, invoicing, branch and compliance pain first.
      </p>
      <Link href={`/home/solutions/${primarySolution.slug}`} className={styles.inlineAction}>
        Open commerce page
        <ArrowRight className={styles.icon} weight="regular" />
      </Link>
    </div>
  );
}
