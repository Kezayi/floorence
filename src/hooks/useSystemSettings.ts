import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceSetting {
  amount: number;
  currency: string;
}

export interface DonationSetting {
  enabled: boolean;
}

export interface ContributionLinkSetting {
  url: string;
  enabled: boolean;
}

export interface SystemSettings {
  candle_price: PriceSetting;
  flower_price: PriceSetting;
  donation_enabled: DonationSetting;
  memorial_price_future: PriceSetting;
  memorial_price_past: PriceSetting;
  contribution_link_template: ContributionLinkSetting;
}

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      const settings: SystemSettings = {
        candle_price: { amount: 500, currency: 'XOF' },
        flower_price: { amount: 1000, currency: 'XOF' },
        donation_enabled: { enabled: true },
        memorial_price_future: { amount: 15000, currency: 'XOF' },
        memorial_price_past: { amount: 10000, currency: 'XOF' },
        contribution_link_template: { url: '', enabled: false },
      };

      data?.forEach((row) => {
        if (row.key === 'candle_price') {
          settings.candle_price = row.value as unknown as PriceSetting;
        } else if (row.key === 'flower_price') {
          settings.flower_price = row.value as unknown as PriceSetting;
        } else if (row.key === 'donation_enabled') {
          settings.donation_enabled = row.value as unknown as DonationSetting;
        } else if (row.key === 'memorial_price_future') {
          settings.memorial_price_future = row.value as unknown as PriceSetting;
        } else if (row.key === 'memorial_price_past') {
          settings.memorial_price_past = row.value as unknown as PriceSetting;
        } else if (row.key === 'contribution_link_template') {
          settings.contribution_link_template = row.value as unknown as ContributionLinkSetting;
        }
      });

      return settings;
    },
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: value as any, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
};
