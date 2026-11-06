/** Synchronous cleanup on a shared device; never remove unrelated settings. */
export function clearLegacyVisitorMarkers(): void {
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('wb_cooldown_')) sessionStorage.removeItem(key);
  } catch { /* Storage may be disabled by browser policy. */ }
}

export function clearStaffSessionStorage(legacyKey?: string): void {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('suaipe-staff-auth') || (legacyKey && (key === legacyKey || key.startsWith(legacyKey + '-')))) sessionStorage.removeItem(key);
    }
  } catch { /* The auth guard still checks the server role and MFA. */ }
}
