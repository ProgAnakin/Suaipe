import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionsData } from '@/components/manager/sessions/useSessionsData';
import { submitClaim } from '@/lib/submitClaim';

const mocks = vi.hoisted(() => ({
  queryError: false,
  rpc: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc,
  from() {
    const query = {
      select: () => query, order: () => query, eq: () => query, range: () => query,
      gte: () => query, lte: () => query, or: () => query,
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({ data: mocks.queryError ? null : [{
          id: 'synthetic', nome: '=1+1', cognome: 'Synthetic', email: 'synthetic@example.com',
          matched_product_id: 'synthetic-product', match_percent: 80, store_id: 'lisboa',
          created_at: '2026-11-06T12:00:00Z', email_sent: false, discount_code: null,
        }], count: 1, error: mocks.queryError ? { code: '42501', message: 'denied' } : null }).then(resolve);
      },
    };
    return query;
  },
  channel() {
    const channel = { on: () => channel, subscribe: () => channel };
    return channel;
  },
  removeChannel: vi.fn(),
} }));

let exported = '';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryError = false;
  exported = '';
  vi.stubGlobal('Blob', class { constructor(parts: string[]) { exported = parts.join(''); } });
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:audit', revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Prelaunch probes: desired protections, currently failing', () => {
  it('neutralizes spreadsheet formulas in the manager CSV export', async () => {
    const { result } = renderHook(() => useSessionsData({ storeId: 'lisboa', isGlobal: true }));
    await act(async () => { await result.current.exportToCSV(); });
    expect(exported).not.toContain('"=1+1"');
  });
  it('does not report a successful export after a denied database query', async () => {
    mocks.queryError = true;
    const { result } = renderHook(() => useSessionsData({ storeId: 'lisboa', isGlobal: true }));
    await act(async () => { await result.current.exportToCSV(); });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
  });
  it('bounds a stalled claim so kiosk personal data can eventually reset', async () => {
    vi.useFakeTimers();
    mocks.rpc.mockImplementation(() => new Promise(() => {}));
    let settled = false;
    void submitClaim('90000000-0000-4000-8000-000000000009', {}).then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(settled).toBe(true);
  });
});
