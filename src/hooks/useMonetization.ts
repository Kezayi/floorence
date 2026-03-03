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
    queryFn: async (): Promise<MonetizationState> => {
      // Fetch is_monetized from global_settings
      const { data: settingData, error: settingError } = await supabase
        .from('global_settings')
        .select('value_bool')
        .eq('key', 'is_monetized')
        .maybeSingle();

      if (settingError) throw settingError;

      // Fetch prices from ritual_prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('ritual_prices')
        .select('item_type, unit_price');

      if (pricesError) throw pricesError;

      const prices: Record<string, number> = {};
      (pricesData || []).forEach((row: any) => {
        prices[row.item_type] = row.unit_price;
      });

      return {
        isMonetized: settingData?.value_bool ?? false,
        prices,
      };
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

export const useUpdateRitualPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemType, unitPrice }: { itemType: string; unitPrice: number }) => {
      if (unitPrice < 500) {
        throw new Error('Le prix minimum est de 500 FCFA');
      }
      const { error } = await supabase
        .from('ritual_prices')
        .update({ unit_price: unitPrice })
        .eq('item_type', itemType);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monetization'] });
    },
  });
};
