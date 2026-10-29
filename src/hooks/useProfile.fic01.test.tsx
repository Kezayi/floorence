import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { useProfile } from './useProfile';
const api = vi.hoisted(() => ({ user: { id: 'fixture-owner' }, from: vi.fn(), update: vi.fn(), current: { civility_required: true, civility: null as string | null, profile_completed: false } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: api.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: api.from } }));
describe('FIC-01 authenticated profile completion', () => {
  beforeEach(() => {
    cleanup(); vi.clearAllMocks(); api.current = { civility_required: true, civility: null, profile_completed: false };
    api.from.mockImplementation(() => {
      const chain = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), update: api.update, then: vi.fn() };
      chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); api.update.mockReturnValue(chain);
      chain.single.mockImplementation(async () => ({ data: { id: 'profile', user_id: 'fixture-owner', ...api.current }, error: null }));
      chain.then.mockImplementation((resolve) => resolve({ error: null }));
      return chain;
    });
  });
  it('rejects new completion without declared civility before any write', async () => {
    const { result } = renderHook(useProfile); await waitFor(() => expect(result.current.loading).toBe(false));
    let success: boolean | undefined;
    await act(async () => { success = (await result.current.completeProfile({ display_name: 'Test' })).success; });
    expect(success).toBe(false); expect(api.update).not.toHaveBeenCalled();
  });
  it('persists declared civility on the owner profile', async () => {
    const { result } = renderHook(useProfile); await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { expect((await result.current.completeProfile({ display_name: 'Test', civility: 'Mlle' })).success).toBe(true); });
    expect(api.update).toHaveBeenCalledWith({ display_name: 'Test', civility: 'Mlle', profile_completed: true });
  });
  it('historical missing civility does not revoke completed access', async () => {
    api.current = { civility_required: false, civility: null, profile_completed: true };
    const { result } = renderHook(useProfile); await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isProfileComplete).toBe(true);
    await act(async () => { expect((await result.current.updateProfile({ display_name: 'Test' })).success).toBe(true); });
  });
});