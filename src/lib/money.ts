/** Money helpers. All checkout math is done in integer paise to avoid float errors. */

export function toPaise(rupees: number | string | null | undefined): number {
  const n = typeof rupees === "string" ? Number(rupees) : rupees ?? 0;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export function formatINR(rupees: number | null | undefined, opts?: { decimals?: boolean }): string {
  const value = Number(rupees ?? 0);
  const hasFraction = Math.abs(value % 1) > 0.001;
  const decimals = opts?.decimals ?? hasFraction;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPaiseINR(paise: number): string {
  return formatINR(fromPaise(paise));
}

/** Display the price a customer pays (sale overrides selling). */
export function effectivePriceRupees(p: {
  price_selling: number;
  price_sale: number | null;
}): number {
  const sale = Number(p.price_sale);
  if (Number.isFinite(sale) && sale > 0 && sale < Number(p.price_selling)) return sale;
  return Number(p.price_selling);
}

export function discountPercent(original: number, current: number): number | null {
  if (original > 0 && current < original) {
    return Math.round(((original - current) / original) * 100);
  }
  return null;
}
