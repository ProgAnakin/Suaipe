/**
 * Which claim is this? One identity per (visit, address).
 *
 * A retry of the SAME claim reuses its id, so an attempt whose answer was lost on the way back cannot
 * store — and e-mail — the lead twice: the database answers "duplicate" (23505) and the kiosk calls it
 * a success. A claim for a DIFFERENT address is a different claim. Staff can correct the address on the
 * result screen (PIN + e-mail taps); if that correction reused the old id, the database would say
 * "duplicate" for the FIRST address and the kiosk would report success for the second: the customer
 * would be told the e-mail went to the corrected address while the lead — and the e-mail — went to the old one.
 */
export interface ClaimIdentity {
  id: string;
  /** trimmed, lower-cased: the address this identity was minted for */
  email: string;
}

export function claimIdentityFor(
  previous: ClaimIdentity | null,
  email: string,
  newId: () => string = () => crypto.randomUUID(),
): ClaimIdentity {
  const normalized = email.trim().toLowerCase();
  return previous && previous.email === normalized ? previous : { id: newId(), email: normalized };
}
