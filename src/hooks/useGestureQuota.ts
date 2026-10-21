import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// GEST-01: display-only mirror of the server quota (the server enforces it). Missing setting = 1.
export const GESTURE_QUOTA_KEY = 'gesture_max_per_tribute';

export const useGestureQuota = () =>
  useQuery({
    queryKey: ['system-settings', GESTURE_QUOTA_KEY],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', GESTURE_QUOTA_KEY).maybeSingle();
      const max = (data?.value as { max?: unknown } | null)?.max;
      return typeof max === 'number' && Number.isInteger(max) && max >= 1 && max <= 10 ? max : 1;
    },
    staleTime: 60_000,
  });
