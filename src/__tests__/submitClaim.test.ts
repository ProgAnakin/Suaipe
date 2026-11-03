import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { submitClaim } from '@/lib/submitClaim';
beforeEach(() => { rpc.mockReset(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
describe('claim retries', () => {
  it('uses the same ID and body after a lost response', async () => {
    rpc.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce({ error: null });
    const result = submitClaim('stable-id', { email: 'test@example.com' });
    await vi.runAllTimersAsync();
    expect(await result).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  });
  it('does not retry a rejected product or permission', async () => {
    rpc.mockResolvedValue({ error: { code: '22023' } });
    expect(await submitClaim('id', {})).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('stops after three transport failures', async () => {
    rpc.mockRejectedValue(new Error('offline'));
    const result = submitClaim('id', {});
    await vi.runAllTimersAsync();
    expect(await result).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(3);
  });
});
