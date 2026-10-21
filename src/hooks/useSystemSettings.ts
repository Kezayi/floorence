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

export interface NotificationFrequencySetting {
  frequency: 'immediate' | 'weekly_saturday' | 'monthly_window' | 'none';
}

export interface NotificationWindowSetting {
  start_day: number;
  end_day: number;
}

export interface ObituaryPromoSetting {
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  reason: string | null;
  scope: 'worldwide';
}

export interface SystemSettings {
  obituary_free_campaign: ObituaryPromoSetting;
  candle_price: PriceSetting;
  flower_price: PriceSetting;
  donation_enabled: DonationSetting;
  memorial_price_future: PriceSetting;
  memorial_price_past: PriceSetting;
  contribution_link_template: ContributionLinkSetting;
  notification_frequency: NotificationFrequencySetting;
  notification_window: NotificationWindowSetting;
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
        obituary_free_campaign: { active: false, starts_at: null, ends_at: null, reason: null, scope: 'worldwide' },
        candle_price: { amount: 500, currency: 'XAF' },
        flower_price: { amount: 1000, currency: 'XAF' },
        donation_enabled: { enabled: true },
        memorial_price_future: { amount: 15000, currency: 'XAF' },
        memorial_price_past: { amount: 10000, currency: 'XAF' },
        contribution_link_template: { url: '', enabled: false },
        notification_frequency: { frequency: 'weekly_saturday' },
        notification_window: { start_day: 25, end_day: 5 },
      };

      data?.forEach((row) => {
        if (row.key === 'obituary_free_campaign') {
          settings.obituary_free_campaign = row.value as unknown as ObituaryPromoSetting;
        } else if (row.key === 'candle_price') {
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
        } else if (row.key === 'notification_frequency') {
          settings.notification_frequency = row.value as unknown as NotificationFrequencySetting;
        } else if (row.key === 'notification_window') {
          settings.notification_window = row.value as unknown as NotificationWindowSetting;
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
      const { data, error } = await supabase.functions.invoke('admin-settings', {
        body: { key, value },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
};
