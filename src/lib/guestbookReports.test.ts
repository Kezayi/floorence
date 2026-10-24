import { describe, it, expect, vi, beforeEach } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { reportTribute, listReports, decideTribute } from './guestbookReports';

describe('reporting server boundary', () => {
  beforeEach(() => rpc.mockReset());
  it('sends the reason and optional detail, never a reporter identity or family authority', async () => {
    rpc.mockResolvedValue({ data: { accepted: true, duplicate: false, conservatory_hidden: false }, error: null });
    await reportTribute('post', 'dignite', '  precision  ');
    expect(rpc).toHaveBeenCalledWith('report_guestbook_post', { p_post_id: 'post', p_reason: 'dignite', p_detail: 'precision' });
  });
  it('accepts an idempotent duplicate without claiming a family mask', async () => {
    rpc.mockResolvedValue({ data: { accepted: true, duplicate: true, conservatory_hidden: false }, error: null });
    expect(await reportTribute('post', 'autre', '')).toEqual({ accepted: true, duplicate: true, conservatory_hidden: false });
  });
  it('rejects malformed queue payloads instead of granting admin access from client state', async () => {
    rpc.mockResolvedValue({ data: { pending: '1', items: [] }, error: null });
    await expect(listReports('open', 0)).rejects.toThrow();
  });
  it('editorial restoration never sends financial visibility changes', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await decideTribute('post', 'restore');
    expect(rpc).toHaveBeenCalledWith('moderate_tribute_editorial', { p_post_id: 'post', p_action: 'restore', p_reason: null, p_report_id: null });
  });
});