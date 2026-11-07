import { IS_DEMO } from './demo';
export const MARKETING_ENABLED = !IS_DEMO && import.meta.env.VITE_ENABLE_MARKETING === 'true';
export const MARKETING_NOTICE_VERSION = 'marketing-2026-11-07';
export const MARKETING_LABELS = {
  it: 'Facoltativo: desidero ricevere offerte e novità via email. Posso revocare questo consenso tramite il contatto privacy. Il risultato del quiz non dipende da questa scelta.',
  en: 'Optional: I would like to receive offers and news by email. I can withdraw this consent through the privacy contact. My quiz result does not depend on this choice.',
  pt: 'Opcional: quero receber ofertas e novidades por e-mail. Posso retirar esta autorização pelo contato de privacidade. O resultado do quiz não depende desta escolha.',
  es: 'Opcional: quiero recibir ofertas y novedades por correo. Puedo retirar este consentimiento mediante el contacto de privacidad. El resultado no depende de esta elección.',
  fr: 'Facultatif : je souhaite recevoir des offres et nouveautés par email. Je peux retirer ce consentement via le contact de confidentialité. Mon résultat ne dépend pas de ce choix.',
};
