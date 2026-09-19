import { supabase } from "@/integrations/supabase/client";

export interface GridColumn {
  /** Label printed on the column header, e.g. "30/32/34" */
  label: string;
  /** Product sizes that belong to this column group */
  sizes: string[];
}

export interface GridSummaryGroup {
  label: string;
  /** Row labels (colours) that roll up into this summary line */
  rows: string[];
}

/** Groups individual size columns for combined totals display (e.g. 30/32/34). */
export interface GridSizeGroup {
  label: string;
  /** Column labels that roll up into this group */
  columns: string[];
}

export interface GridLayout {
  id: string;
  /** Product category this grid belongs to */
  category: string;
  name: string;
  /** What the rows represent: usually colours, sometimes sizes */
  rowHeader: string;
  rows: string[];
  columns: GridColumn[];
  /** Optional grouping of columns used only for combined totals display */
  sizeGroups?: GridSizeGroup[];
  summaryGroups: GridSummaryGroup[];
  unit: string;
  isActive: boolean;
}

export const SETTING_KEY = "order_grid_layouts";

export const DEFAULT_GRID_LAYOUTS: GridLayout[] = [
  {
    id: "senorita",
    category: "Senorita",
    name: "Senorita",
    rowHeader: "Colour / Lace",
    rows: [
      "White Half Lace",
      "White Side Lace",
      "Black Half Lace",
      "Black Side Lace",
      "Beige Half Lace",
      "Beige Side Lace",
      "Brown Half Lace",
      "Brown Side Lace",
      "IVY Half Lace",
      "IVY Side Lace",
      "Burgandy Half Lace",
      "Burgandy Side Lace",
    ],
    columns: [
      { label: "30", sizes: ["30"] },
      { label: "32", sizes: ["32"] },
      { label: "34", sizes: ["34"] },
      { label: "36", sizes: ["36"] },
      { label: "38", sizes: ["38"] },
      { label: "40", sizes: ["40"] },
      { label: "42", sizes: ["42"] },
    ],
    sizeGroups: [
      { label: "30/32/34", columns: ["30", "32", "34"] },
      { label: "36/38", columns: ["36", "38"] },
      { label: "40", columns: ["40"] },
      { label: "42", columns: ["42"] },
    ],
    summaryGroups: [
      { label: "WHITE", rows: ["White Half Lace", "White Side Lace"] },
      {
        label: "COLOUR",
        rows: [
          "Black Half Lace",
          "Black Side Lace",
          "Beige Half Lace",
          "Beige Side Lace",
          "Brown Half Lace",
          "Brown Side Lace",
          "IVY Half Lace",
          "IVY Side Lace",
          "Burgandy Half Lace",
          "Burgandy Side Lace",
        ],
      },
    ],
    unit: "dozen",
    isActive: true,
  },
  {
    id: "apsara",
    category: "Apsara",
    name: "Apsara",
    rowHeader: "Colour",
    rows: ["White", "Black", "Beige", "Brown", "IVY", "Burgandy", "Red", "Blue"],
    columns: [
      { label: "30", sizes: ["30"] },
      { label: "32", sizes: ["32"] },
      { label: "34", sizes: ["34"] },
      { label: "36", sizes: ["36"] },
      { label: "38", sizes: ["38"] },
      { label: "40", sizes: ["40"] },
    ],
    sizeGroups: [
      { label: "30/32/34", columns: ["30", "32", "34"] },
      { label: "36/38", columns: ["36", "38"] },
      { label: "40", columns: ["40"] },
    ],
    summaryGroups: [
      { label: "WHITE", rows: ["White"] },
      { label: "COLOURS", rows: ["Black", "Beige", "Brown", "IVY", "Burgandy", "Red", "Blue"] },
    ],
    unit: "dozen",
    isActive: true,
  },
  {
    id: "school-socks",
    category: "School Socks",
    name: "School Socks",
    rowHeader: "Size",
    rows: ["L", "M", "CM", "S"],
    columns: [
      { label: "White", sizes: ["White"] },
      { label: "Black", sizes: ["Black"] },
      { label: "Two Tone", sizes: ["Two Tone", "TT"] },
    ],
    summaryGroups: [],
    unit: "dozen",
    isActive: true,
  },
  {
    id: "panties",
    category: "Panties",
    name: "Panties",
    rowHeader: "Item",
    rows: ["Pantie"],
    columns: [
      { label: "S", sizes: ["S"] },
      { label: "M", sizes: ["M"] },
      { label: "L", sizes: ["L"] },
      { label: "XL", sizes: ["XL"] },
      { label: "XXL", sizes: ["XXL"] },
    ],
    summaryGroups: [],
    unit: "dozen",
    isActive: true,
  },
  {
    id: "teenage-bra",
    category: "Teenage Bra",
    name: "Teenage Bra",
    rowHeader: "Colour",
    rows: ["White", "Pink", "Peach", "IVY", "Black", "Burgandy", "Blue", "Leopard Print"],
    columns: [
      { label: "28", sizes: ["28"] },
      { label: "30", sizes: ["30"] },
      { label: "32", sizes: ["32"] },
      { label: "34", sizes: ["34"] },
    ],
    sizeGroups: [
      { label: "28", columns: ["28"] },
      { label: "30", columns: ["30"] },
      { label: "32/34", columns: ["32", "34"] },
    ],
    summaryGroups: [
      { label: "WHITE / PINK / PEACH / IVY", rows: ["White", "Pink", "Peach", "IVY"] },
      { label: "BLACK / BURGANDY / BLUE", rows: ["Black", "Burgandy", "Blue"] },
      { label: "LEOPARD PRINT", rows: ["Leopard Print"] },
    ],
    unit: "dozen",
    isActive: true,
  },
  {
    id: "senorita-padded",
    category: "Senorita Padded",
    name: "Senorita Padded",
    rowHeader: "Colour",
    rows: ["White", "Black", "Beige", "Brown", "IVY", "Burgandy"],
    columns: [
      { label: "30", sizes: ["30"] },
      { label: "32", sizes: ["32"] },
      { label: "34", sizes: ["34"] },
      { label: "36", sizes: ["36"] },
    ],
    sizeGroups: [
      { label: "30/32/34", columns: ["30", "32", "34"] },
      { label: "36", columns: ["36"] },
    ],
    summaryGroups: [
      { label: "WHITE", rows: ["White"] },
      { label: "COLOUR", rows: ["Black", "Beige", "Brown", "IVY", "Burgandy"] },
    ],
    unit: "dozen",
    isActive: true,
  },
  {
    id: "apsara-padded",
    category: "Apsara Padded",
    name: "Apsara Padded",
    rowHeader: "Colour",
    rows: ["White", "Black", "Beige", "Brown", "IVY", "Burgandy", "Red", "Blue"],
    columns: [
      { label: "30", sizes: ["30"] },
      { label: "32", sizes: ["32"] },
      { label: "34", sizes: ["34"] },
      { label: "36", sizes: ["36"] },
    ],
    sizeGroups: [
      { label: "30/32/34", columns: ["30", "32", "34"] },
      { label: "36", columns: ["36"] },
    ],
    summaryGroups: [
      { label: "WHITE", rows: ["White"] },
      { label: "COLOURS", rows: ["Black", "Beige", "Brown", "IVY", "Burgandy", "Red", "Blue"] },
    ],
    unit: "dozen",
    isActive: true,
  },
];


export async function loadGridLayouts(): Promise<GridLayout[]> {
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", SETTING_KEY)
    .maybeSingle();

  if (data?.setting_value) {
    try {
      const parsed = JSON.parse(data.setting_value);
      if (Array.isArray(parsed) && parsed.length) return parsed as GridLayout[];
    } catch {
      /* fall through to defaults */
    }
  }
  return DEFAULT_GRID_LAYOUTS;
}

export async function saveGridLayouts(layouts: GridLayout[]) {
  const value = JSON.stringify(layouts);
  const { data } = await supabase
    .from("system_settings")
    .select("id")
    .eq("setting_key", SETTING_KEY)
    .maybeSingle();

  if (data?.id) {
    const { error } = await supabase
      .from("system_settings")
      .update({ setting_value: value })
      .eq("id", data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("system_settings").insert({
      setting_key: SETTING_KEY,
      setting_value: value,
      setting_type: "json",
      description: "Configurable category grid entry layouts for orders and invoices",
    });
    if (error) throw error;
  }
}

const norm = (v: string) => (v || "").toString().trim().toLowerCase();

/** Find the product that belongs in a grid cell. */
export function findCellProduct(
  products: any[],
  layout: GridLayout,
  row: string,
  column: GridColumn
) {
  const rowIsSize = norm(layout.rowHeader).includes("size");
  return products.find((p) => {
    if (norm(p.category) !== norm(layout.category)) return false;
    if (rowIsSize) {
      const sizeMatch = norm(p.size) === norm(row);
      const colourMatch = column.sizes.some((s) => norm(s) === norm(p.colour));
      return sizeMatch && colourMatch;
    }
    const rowN = norm(row);
    const colourN = norm(p.colour);
    const nameN = norm(p.name);
    let colourMatch = rowN === colourN || rowN === nameN;
    if (!colourMatch && colourN && rowN.startsWith(colourN)) {
      // e.g. row "White Full Leg" => colour "White" + descriptor matched on the name
      const descriptor = rowN.slice(colourN.length).trim();
      colourMatch = !descriptor || descriptor.split(" ").every((w) => nameN.includes(w));
    }
    if (!colourMatch && rowN && nameN.includes(rowN)) colourMatch = true;
    const sizeMatch = column.sizes.some((s) => norm(s) === norm(p.size));
    return colourMatch && sizeMatch;
  });
}
