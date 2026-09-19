import { supabase } from "@/integrations/supabase/client";

export interface PriceRule {
  id: string;
  category: string;
  size_group: string | null;
  colour_group: string | null;
  unit: string;
  price: number;
  is_flat_rate: boolean;
  customer_id: string | null;
  priority: number;
  is_active: boolean;
}

const norm = (v?: string | null) => (v || "").toString().trim().toLowerCase();

export async function loadPriceRules(): Promise<PriceRule[]> {
  const { data } = await supabase
    .from("category_price_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false });
  return (data as PriceRule[]) || [];
}

export interface ResolvePriceArgs {
  rules: PriceRule[];
  category?: string | null;
  sizeGroup?: string | null;
  colourGroup?: string | null;
  customerId?: string | null;
  /** Fallback when no rule matches — normally the product's selling price */
  fallbackPrice: number;
}

/**
 * Shared price resolution used by grid entry, order lines and invoice lines.
 *
 * Precedence (most specific first):
 *  1. Customer + size group + colour group
 *  2. Customer + size group
 *  3. Customer flat rate for the category
 *  4. Base size group + colour group
 *  5. Base size group
 *  6. Base flat rate for the category
 *  7. Product selling price
 */
export function resolvePrice({
  rules,
  category,
  sizeGroup,
  colourGroup,
  customerId,
  fallbackPrice,
}: ResolvePriceArgs): number {
  const inCategory = rules.filter((r) => norm(r.category) === norm(category));
  if (!inCategory.length) return fallbackPrice;

  const score = (r: PriceRule): number => {
    if (r.customer_id && r.customer_id !== customerId) return -1;
    if (r.size_group && norm(r.size_group) !== norm(sizeGroup)) return -1;
    if (r.colour_group && norm(r.colour_group) !== norm(colourGroup)) return -1;

    let s = 0;
    if (r.customer_id) s += 100;
    if (r.size_group) s += 10;
    if (r.colour_group) s += 5;
    if (r.is_flat_rate) s += 1;
    s += r.priority || 0;
    return s;
  };

  let best: PriceRule | null = null;
  let bestScore = -1;
  for (const rule of inCategory) {
    const s = score(rule);
    if (s > bestScore) {
      bestScore = s;
      best = rule;
    }
  }

  return best && bestScore >= 0 ? Number(best.price) : fallbackPrice;
}

/** Which summary/colour group a row label belongs to, for pricing lookups. */
export function colourGroupForRow(
  row: string,
  summaryGroups: { label: string; rows: string[] }[]
): string | null {
  const group = summaryGroups.find((g) => g.rows.some((r) => norm(r) === norm(row)));
  return group ? group.label : null;
}
