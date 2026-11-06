/** Defense in depth. Never log the key or decoded claims. */
export function assertPublicSupabaseKey(key: string): void {
  key = key.trim();
  if (/^(sb_secret_|sbp_)/.test(key)) throw new Error('A private credential cannot be used in the browser.');
  const payload = key.split('.')[1];
  if (!payload) return;
  let role: unknown;
  try { role = JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))).role; } catch { return; }
  if (role && role !== 'anon') throw new Error('Only a public Supabase credential is allowed.');
}
