import { beforeEach, describe, expect, it } from 'vitest';
import { clearLegacyVisitorMarkers, clearStaffSessionStorage } from '@/lib/kioskPrivacy';
beforeEach(() => sessionStorage.clear());
describe('Shared kiosk storage', () => {
  it('removes historical address markers without losing catalog/settings', () => {
    sessionStorage.setItem('wb_cooldown_synthetic@example.com','123');
    sessionStorage.setItem('wb_store_id','lisboa');
    sessionStorage.setItem('suaipe-staff-auth','synthetic-session');
    clearLegacyVisitorMarkers();
    expect(sessionStorage.getItem('wb_cooldown_synthetic@example.com')).toBeNull();
    expect(sessionStorage.getItem('wb_store_id')).toBe('lisboa');
    expect(sessionStorage.getItem('suaipe-staff-auth')).toBe('synthetic-session');
  });
  it('clears staff credentials when returning to the customer route', () => {
    sessionStorage.setItem('suaipe-staff-auth','synthetic-session');
    sessionStorage.setItem('sb-example-auth-token','synthetic-legacy-session');
    sessionStorage.setItem('wb_store_id','lisboa');
    clearStaffSessionStorage('sb-example-auth-token');
    expect(sessionStorage.getItem('suaipe-staff-auth')).toBeNull();
    expect(sessionStorage.getItem('sb-example-auth-token')).toBeNull();
    expect(sessionStorage.getItem('wb_store_id')).toBe('lisboa');
  });
});
