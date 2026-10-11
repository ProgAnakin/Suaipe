import { isValidStoreId } from "@/lib/validators";

export interface Store {
  id: string;
  name: string;
  shortName: string;
}

/** The stores this build ships with — replace them with yours (see VITE_STORES below). */
export const DEFAULT_STORES: Store[] = [
  { id: "rio-de-janeiro", name: "Suaipe Rio de Janeiro", shortName: "Rio de Janeiro" },
  { id: "lisboa",         name: "Suaipe Lisboa",         shortName: "Lisboa"         },
  { id: "dublino",        name: "Suaipe Dublino",        shortName: "Dublino"        },
  { id: "milano",         name: "Suaipe Milano",         shortName: "Milano"         },
];

/**
 * Reads a store list from the VITE_STORES build variable — a JSON array of
 * `{ "id": "my-store", "name": "My Brand My Store", "shortName": "My Store" }` — so the stores
 * are configured where the rest of the deployment is (Vercel env vars), not by editing source.
 * `id` is a kebab-case slug (it is stored with every lead and must match the database check
 * `^[a-z0-9][a-z0-9-]{1,49}$`). Returns null — and the built-in list is used — when the variable
 * is missing or anything in it is malformed, so a typo cannot leave a kiosk with no stores.
 */
export function parseStores(raw: unknown): Store[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return null;
    const seen = new Set<string>();
    const stores: Store[] = [];
    for (const item of list as Array<Partial<Store>>) {
      if (!item || !isValidStoreId(item.id) || typeof item.name !== "string" || !item.name.trim()
        || typeof item.shortName !== "string" || !item.shortName.trim() || seen.has(item.id as string)) return null;
      seen.add(item.id as string);
      stores.push({ id: item.id as string, name: item.name.trim(), shortName: item.shortName.trim() });
    }
    return stores;
  } catch {
    return null;
  }
}

export const STORES: Store[] = parseStores(import.meta.env.VITE_STORES) ?? DEFAULT_STORES;

/** The store whose catalogue a device loads before staff have picked one (the first in the list). */
export const DEFAULT_STORE_ID = STORES[0]?.id ?? "";

export const STORE_LS_KEY = "wb_store_id";

export function getStoredStoreId(): string | null {
  try { return localStorage.getItem(STORE_LS_KEY); } catch { return null; }
}

export function setStoredStoreId(id: string): void {
  try { localStorage.setItem(STORE_LS_KEY, id); } catch { /* localStorage unavailable — private browsing or storage quota exceeded */ }
}

export function getStoreById(id: string): Store | undefined {
  return STORES.find((s) => s.id === id);
}
