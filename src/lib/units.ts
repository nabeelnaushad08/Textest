/**
 * Shared unit conversion helpers.
 *
 * Every stock-affecting code path (orders, invoices, purchases, adjustments)
 * MUST use convertToBaseUnits() so that quantities always reduce/increase
 * stock in base pieces, no matter which unit the user typed in.
 */

export type ConversionRates = Record<string, number> | null | undefined;

export interface UnitTypeLike {
  symbol: string;
  name?: string;
  conversion_to_pcs: number;
}

const normalise = (unit: string) =>
  (unit || "").toString().trim().toLowerCase().replace(/[\s_]+/g, "-");

/**
 * Resolve how many base pieces one `unit` represents for a product.
 * Product specific `conversion_rates` win, then the admin managed unit types,
 * then a safe fallback of 1.
 */
export function getConversionRate(
  unit: string,
  productConversionRates?: ConversionRates,
  unitTypes?: UnitTypeLike[]
): number {
  const target = normalise(unit);
  if (!target) return 1;

  if (productConversionRates && typeof productConversionRates === "object") {
    for (const [key, value] of Object.entries(productConversionRates)) {
      if (normalise(key) === target) {
        const rate = Number(value);
        if (Number.isFinite(rate) && rate > 0) return rate;
      }
    }
  }

  if (unitTypes?.length) {
    const match = unitTypes.find((u) => normalise(u.symbol) === target);
    const rate = Number(match?.conversion_to_pcs);
    if (Number.isFinite(rate) && rate > 0) return rate;
  }

  // Last resort defaults for the well known units.
  const defaults: Record<string, number> = {
    pcs: 1,
    piece: 1,
    pieces: 1,
    dozen: 12,
    doz: 12,
    "half-dozen": 6,
    "24-pack": 24,
  };
  return defaults[target] ?? 1;
}

/**
 * Convert an entered quantity (may be decimal, e.g. 0.5 dozen) into base pieces.
 */
export function convertToBaseUnits(
  quantity: number,
  unit: string,
  productConversionRates?: ConversionRates,
  unitTypes?: UnitTypeLike[]
): number {
  const qty = Number(quantity) || 0;
  const rate = getConversionRate(unit, productConversionRates, unitTypes);
  // Round to 4 decimals to avoid floating point drift (0.25 * 12 = 3).
  return Math.round(qty * rate * 10000) / 10000;
}

/** Human readable "2 dozen (24 pcs)" style label. */
export function formatQuantityWithBase(
  quantity: number,
  unit: string,
  productConversionRates?: ConversionRates,
  unitTypes?: UnitTypeLike[]
): string {
  const base = convertToBaseUnits(quantity, unit, productConversionRates, unitTypes);
  const qtyLabel = `${Number(quantity) || 0} ${unit}`;
  if (normalise(unit) === "pcs") return qtyLabel;
  return `${qtyLabel} (${base} pcs)`;
}
