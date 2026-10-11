export interface Store {
  id: string;
  name: string;
  shortName: string;
}

export const STORES: Store[] = [
  { id: "rio-de-janeiro", name: "Suaipe Rio de Janeiro", shortName: "Rio de Janeiro" },
  { id: "lisboa",         name: "Suaipe Lisboa",         shortName: "Lisboa"         },
  { id: "dublino",        name: "Suaipe Dublino",        shortName: "Dublino"        },
  { id: "milano",         name: "Suaipe Milano",         shortName: "Milano"         },
];

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
