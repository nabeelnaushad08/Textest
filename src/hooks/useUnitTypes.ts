import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UnitType {
  id: string;
  name: string;
  symbol: string;
  conversion_to_pcs: number;
  is_active: boolean;
  display_order: number;
}

export function useUnitTypes() {
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnitTypes();
  }, []);

  const fetchUnitTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("unit_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    
    if (data) {
      setUnitTypes(data);
    }
    setLoading(false);
  };

  const getConversionRate = (symbol: string): number => {
    const unit = unitTypes.find(u => u.symbol === symbol);
    return unit?.conversion_to_pcs || 1;
  };

  return { unitTypes, loading, fetchUnitTypes, getConversionRate };
}