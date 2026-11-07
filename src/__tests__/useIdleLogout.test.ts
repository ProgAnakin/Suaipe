import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const signOut = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ LEGACY_AUTH_STORAGE_KEY:'sb-fixture-auth-token', supabase:{auth:{signOut}} }));
import { useIdleLogout } from '@/hooks/useIdleLogout';
import { ADMIN_IDLE_TIMEOUT_MS } from '@/config/timings';

beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); signOut.mockReset(); });
afterEach(() => { vi.useRealTimers(); });
describe('idle logout on a shared device', () => {
  it('hides the dashboard and removes credentials while Auth never responds', () => {
    signOut.mockReturnValue(new Promise(() => {}));
    sessionStorage.setItem('suaipe-staff-auth', 'synthetic-token');
    sessionStorage.setItem('sb-fixture-auth-token', 'legacy-token');
    sessionStorage.setItem('wb_lang', 'pt');
    const onLogout=vi.fn(); renderHook(() => useIdleLogout(onLogout));
    act(() => vi.advanceTimersByTime(ADMIN_IDLE_TIMEOUT_MS));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('suaipe-staff-auth')).toBeNull();
    expect(sessionStorage.getItem('sb-fixture-auth-token')).toBeNull();
    expect(sessionStorage.getItem('wb_lang')).toBe('pt');
  });
  it('still locks on an Auth rejection and clears a late refresh', async () => {
    let reject!: (error:Error)=>void;
    signOut.mockReturnValue(new Promise((_resolve,r) => {reject=r;}));
    const onLogout=vi.fn(); renderHook(() => useIdleLogout(onLogout));
    act(() => vi.advanceTimersByTime(ADMIN_IDLE_TIMEOUT_MS));
    sessionStorage.setItem('suaipe-staff-auth','late-refresh');
    await act(async () => { reject(new Error('offline')); });
    expect(onLogout).toHaveBeenCalledOnce();expect(sessionStorage.getItem('suaipe-staff-auth')).toBeNull();
  });
  it('resets on activity and cancels on unmount', () => {
    signOut.mockResolvedValue({error:null});const onLogout=vi.fn();
    const {unmount}=renderHook(() => useIdleLogout(onLogout));
    act(() => {vi.advanceTimersByTime(ADMIN_IDLE_TIMEOUT_MS-1);window.dispatchEvent(new Event('keydown'));vi.advanceTimersByTime(2);});
    expect(onLogout).not.toHaveBeenCalled();unmount();
    act(() => vi.advanceTimersByTime(ADMIN_IDLE_TIMEOUT_MS));expect(onLogout).not.toHaveBeenCalled();
  });
});
