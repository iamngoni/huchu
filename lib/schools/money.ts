/**
 * School money — one place that knows what a fee amount is.
 *
 * Before S-2.1 every fee column was a `Float` and six route files each carried
 * their own copy of
 *
 *   `Math.round((value + Number.EPSILON) * 100) / 100`
 *
 * to paper over it. That helper is not merely inelegant, it is wrong: 8.575
 * comes back as 8.57, because 8.575 is not representable in binary and the
 * epsilon nudge is far too small at that magnitude to reach the tie. Postgres
 * `numeric` rounds the same value to 8.58, which is the cent a bursar counted
 * into the tin. The columns are `Decimal(14,2)` now and this file is what the
 * routes use instead.
 *
 * The rule, borrowed verbatim from `lib/gold/decimal-utils.ts`: **never
 * silently lose precision.** Anything that accumulates — a sum over invoice
 * lines, over allocations, over waivers — stays a `Prisma.Decimal` from the
 * read to the write. `toNumber` exists only for the two places a plain number
 * is genuinely wanted: a comparison against a request body, and a value handed
 * to an API that takes `number`.
 *
 * Responses need no help. `successResponse` runs `serializeDecimals`, which
 * turns every `Prisma.Decimal` in the payload into a `Number` — safe below 15
 * significant digits, which `Decimal(14,2)` is and `Decimal(14,4)` would not
 * be.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Anything Prisma or a request body may hand us where money is expected. */
export type MoneyLike =
  | Prisma.Decimal
  | number
  | bigint
  | string
  | null
  | undefined;

/** Cents. Every `@db.Decimal(14,2)` column in the school fee surface. */
export const MONEY_SCALE = 2;

/**
 * Quantities and exchange rates — `@db.Decimal(12,4)`. Four places because a
 * term billed a third at a time is 0.3333 of it, and because the repo already
 * uses `Decimal(12,4)` for every per-unit rate it has.
 */
export const RATE_SCALE = 4;

/** Tax rates — `@db.Decimal(5,2)`, a percentage between 0 and 100. */
export const PERCENT_SCALE = 2;

/**
 * Half-up, away from zero. The same rule Postgres `numeric` applies, so a
 * value rounded here and a value rounded by the column agree.
 */
const HALF_UP = Prisma.Decimal.ROUND_HALF_UP;

export const ZERO = new Prisma.Decimal(0);

function decimalise(value: MoneyLike): Prisma.Decimal {
  if (value == null) return new Prisma.Decimal(0);
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === "bigint") return new Prisma.Decimal(value.toString());
  const decimal = new Prisma.Decimal(value);
  if (!decimal.isFinite()) {
    throw new TypeError(`Not a finite money value: ${String(value)}`);
  }
  return decimal;
}

/** Coerce to a money `Decimal`, rounded to the cent. Null and undefined are zero. */
export function money(value: MoneyLike): Prisma.Decimal {
  return decimalise(value).toDecimalPlaces(MONEY_SCALE, HALF_UP);
}

/** As `money`, but a missing value stays missing rather than becoming zero. */
export function moneyOrNull(value: MoneyLike): Prisma.Decimal | null {
  if (value == null) return null;
  return money(value);
}

/** A quantity or an exchange rate, at four places. */
export function rate(value: MoneyLike): Prisma.Decimal {
  return decimalise(value).toDecimalPlaces(RATE_SCALE, HALF_UP);
}

/** A tax rate, at two places. */
export function percent(value: MoneyLike): Prisma.Decimal {
  return decimalise(value).toDecimalPlaces(PERCENT_SCALE, HALF_UP);
}

/**
 * Sum money exactly.
 *
 * Accumulates in `Decimal` and rounds once at the end, so a hundred invoice
 * lines cannot drift the way a hundred `+=` on a double would.
 */
export function sumMoney(values: Iterable<MoneyLike>): Prisma.Decimal {
  let total = new Prisma.Decimal(0);
  for (const value of values) total = total.plus(decimalise(value));
  return total.toDecimalPlaces(MONEY_SCALE, HALF_UP);
}

/** `quantity × unitAmount`, at the cent. */
export function multiplyMoney(quantity: MoneyLike, unitAmount: MoneyLike) {
  return decimalise(quantity)
    .times(decimalise(unitAmount))
    .toDecimalPlaces(MONEY_SCALE, HALF_UP);
}

/** Tax on a net amount at a percentage rate, at the cent. */
export function taxOn(netAmount: MoneyLike, taxRatePercent: MoneyLike) {
  return decimalise(netAmount)
    .times(decimalise(taxRatePercent))
    .dividedBy(100)
    .toDecimalPlaces(MONEY_SCALE, HALF_UP);
}

/** The larger of two money values. */
export function maxMoney(a: MoneyLike, b: MoneyLike): Prisma.Decimal {
  const left = money(a);
  const right = money(b);
  return left.greaterThan(right) ? left : right;
}

/** Never below zero. */
export function clampAtZero(value: MoneyLike): Prisma.Decimal {
  const amount = money(value);
  return amount.isNegative() ? new Prisma.Decimal(0) : amount;
}

export function isPositive(value: MoneyLike): boolean {
  return money(value).greaterThan(0);
}

export function isZeroOrLess(value: MoneyLike): boolean {
  return !isPositive(value);
}

/** `a > b`, exactly. Replaces the `a - b > 0.009` epsilon fudges. */
export function exceeds(a: MoneyLike, b: MoneyLike): boolean {
  return money(a).greaterThan(money(b));
}

/**
 * Coerce to `number`. Null and undefined stay null.
 *
 * Post S-2.1 Float→Decimal: use this only at a boundary that genuinely takes a
 * number. Do not use it to do arithmetic — that is what the helpers above are
 * for.
 */
export function toNumber(value: MoneyLike): number | null {
  if (value == null) return null;
  return Number(value);
}

export function toNumberOrZero(value: MoneyLike): number {
  if (value == null) return 0;
  return Number(value);
}

/**
 * The document amount expressed in the company's base currency.
 *
 * `exchangeRate` follows the repo's one existing FX convention, `CurrencyRate`:
 * the rate is **quote units per one base unit** — `{baseCurrency: "USD",
 * quoteCurrency: "ZWG", rate: 27.5}` means 27.5 ZWG buys 1 USD. So a ZWG
 * invoice divides by the rate to reach USD, and a document already in the base
 * currency carries a rate of 1 and converts to itself.
 */
export function toBaseAmount(amount: MoneyLike, exchangeRate: MoneyLike) {
  const fx = rate(exchangeRate);
  if (fx.lessThanOrEqualTo(0)) {
    throw new RangeError("Exchange rate must be greater than zero");
  }
  return decimalise(amount)
    .dividedBy(fx)
    .toDecimalPlaces(MONEY_SCALE, HALF_UP);
}

/** The currency a school's ledger is kept in. */
export async function resolveBaseCurrency(companyId: string): Promise<string> {
  const settings = await prisma.accountingSettings.findUnique({
    where: { companyId },
    select: { baseCurrency: true },
  });
  return settings?.baseCurrency?.trim().toUpperCase() || "USD";
}

/**
 * The rate to stamp on a document, from the school's own `CurrencyRate` table.
 *
 * A document in the base currency is always 1. Anything else takes the most
 * recent rate on or before the document date; a school that has not entered
 * one gets an error rather than a silently invented number, because a wrong
 * rate is a wrong ledger.
 */
export async function resolveExchangeRate(input: {
  companyId: string;
  currency: string;
  baseCurrency: string;
  on?: Date;
}): Promise<Prisma.Decimal> {
  const currency = input.currency.trim().toUpperCase();
  const baseCurrency = input.baseCurrency.trim().toUpperCase();
  if (currency === baseCurrency) return new Prisma.Decimal(1);

  const row = await prisma.currencyRate.findFirst({
    where: {
      companyId: input.companyId,
      baseCurrency,
      quoteCurrency: currency,
      effectiveDate: { lte: input.on ?? new Date() },
    },
    orderBy: [{ effectiveDate: "desc" }],
    select: { rate: true },
  });

  const resolved = row ? rate(row.rate) : null;
  if (!resolved || resolved.lessThanOrEqualTo(0)) {
    throw new UnknownExchangeRateError(currency, baseCurrency);
  }
  return resolved;
}

export type ResolvedDocumentCurrency = {
  /** The currency the school keeps its books in. */
  baseCurrency: string;
  /** The currency this invoice, receipt or waiver is denominated in. */
  currency: string;
  /** Quote units per one base unit, at the document's date. */
  exchangeRate: Prisma.Decimal;
};

/**
 * Everything a fee document needs to stamp itself.
 *
 * Omitting `currency` means "the school's own", which is the case for every
 * tenant that has not turned on a second one — so the whole feature costs an
 * existing school nothing.
 */
export async function resolveDocumentCurrency(input: {
  companyId: string;
  currency?: string | null;
  on?: Date;
}): Promise<ResolvedDocumentCurrency> {
  const baseCurrency = await resolveBaseCurrency(input.companyId);
  const currency = input.currency?.trim().toUpperCase() || baseCurrency;
  const exchangeRate = await resolveExchangeRate({
    companyId: input.companyId,
    currency,
    baseCurrency,
    on: input.on,
  });
  return { baseCurrency, currency, exchangeRate };
}

export class UnknownExchangeRateError extends Error {
  constructor(currency: string, baseCurrency: string) {
    super(
      `No ${currency} to ${baseCurrency} exchange rate has been set for this school`,
    );
    this.name = "UnknownExchangeRateError";
  }
}
