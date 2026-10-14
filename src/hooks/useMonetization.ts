import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RitualPrice {
  item_type: string;
  unit_price: number;
}

export interface MonetizationState {
  isMonetized: boolean;
  prices: Record<string, number>;
}

export const useMonetization = () => {
  return useQuery({
    queryKey: ['monetization'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 5000,
    queryFn: async (): Promise<MonetizationState> => {
      // Fetch is_monetized from global_settings
      const { data: settingData, error: settingError } = await supabase
        .from('global_settings')
        .select('value_bool')
        .eq('key', 'is_monetized')
        .maybeSingle();

      if (settingError) {
        console.error('[Monetization Audit] ❌ global_settings query failed:', settingError);
        throw settingError;
      }

      if (!settingData) {
        console.error('[Monetization Audit] ⚠️ Row "is_monetized" NOT FOUND in global_settings — check DB seed');
      }

      // Fetch prices from ritual_prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('ritual_prices')
        .select('item_type, unit_price');

      if (pricesError) {
        console.error('[Monetization Audit] ❌ ritual_prices query failed:', pricesError);
        throw pricesError;
      }

      const prices: Record<string, number> = {};
      (pricesData || []).forEach((row: any) => {
        prices[row.item_type] = row.unit_price;
      });

      const result: MonetizationState = {
        isMonetized: settingData?.value_bool ?? false,
        prices,
      };

      console.log('[Monetization Audit]', {
        raw_setting: settingData,
        raw_prices: pricesData,
        resolved: result,
      });

      return result;
    },
  });
};

export const useUpdateMonetization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ isMonetized }: { isMonetized: boolean }) => {
      const { error } = await supabase
        .from('global_settings')
        .update({ value_bool: isMonetized, updated_at: new Date().toISOString() })
        .eq('key', 'is_monetized');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monetization'] });
    },
  });
};

// G1-FIX6: prices are written to system_settings through the audited admin function;
// ritual_prices is a database-synced mirror.
const RITUAL_SETTING_KEY: Record<string, string> = { cierge: 'candle_price', fleur: 'flower_price' };

export const useUpdateRitualPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemType, unitPrice }: { itemType: string; unitPrice: number }) => {
      if (unitPrice < 500) {
        throw new Error('Le prix minimum est de 500 FCFA');
      }
      const key = RITUAL_SETTING_KEY[itemType];
      if (!key) throw new Error('Type de geste inconnu');
      const { data, error } = await supabase.functions.invoke('admin-settings', {
        body: { key, value: { amount: unitPrice, currency: 'XAF' } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monetization'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
};
