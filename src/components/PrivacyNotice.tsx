import { IS_DEMO } from "@/config/demo";
import { PRIVACY_NOTICE_VERSION } from "@/config/privacy";
import { useLang } from "@/i18n/LanguageContext";
import type { Lang } from "@/i18n/translations";

// Plain-language GDPR privacy notice shown to the customer before they hand
// over their name and email. Rendered both in a modal on the welcome screen
// and as the standalone /privacy page.
//
// ⚠ This is an accurate, good-faith notice — but it must be reviewed and
// approved by Suaipe's legal/DPO before commercial rollout, and the contact
// address and retention period confirmed.
//
// GDPR Art. 12(1) requires the notice to be in "clear and plain language"
// the data subject understands — so every kiosk language has its own copy.

const CONTACT_EMAIL = import.meta.env.VITE_PRIVACY_CONTACT || "suaipe@example.invalid";
const CONTROLLER = import.meta.env.VITE_PRIVACY_CONTROLLER || "Costanzo Annichini";

interface Section { h: string; p: string; }
interface NoticeContent { title: string; intro: string; sections: Section[]; }

const CONTENT: Record<Lang, NoticeContent> = {
  it: {
    title: "Informativa sulla privacy",
    intro:
      "Questa informativa spiega quali dati raccogliamo tramite il quiz in negozio e come li usiamo.",
    sections: [
      { h: "Titolare del trattamento", p: "Suaipe è il titolare del trattamento dei dati raccolti tramite questo chiosco." },
      { h: "Dati raccolti", p: "Nome, cognome e indirizzo email. Vengono inoltre registrate le tue risposte al quiz, usate solo per calcolare il prodotto consigliato." },
      { h: "Finalità", p: "Inviarti via email il prodotto consigliato, il relativo codice sconto e le informazioni associate. I dati non vengono usati per altre finalità di marketing senza un ulteriore consenso." },
      { h: "Base giuridica", p: "Il trattamento si basa sul tuo consenso esplicito, prestato spuntando l'apposita casella prima di iniziare." },
      { h: "Conservazione", p: "I dati vengono conservati per il tempo necessario alla finalità indicata e periodicamente eliminati. Puoi richiederne la cancellazione in qualsiasi momento." },
      { h: "Responsabili esterni", p: "I dati sono ospitati su Supabase (infrastruttura) e l'email è inviata tramite Brevo (invio email transazionali), che agiscono come responsabili del trattamento." },
      { h: "I tuoi diritti", p: `Puoi richiedere l'accesso, la rettifica, la cancellazione dei tuoi dati e revocare il consenso in qualsiasi momento scrivendo a ${CONTACT_EMAIL}.` },
    ],
  },
  en: {
    title: "Privacy Notice",
    intro:
      "This notice explains what data we collect through the in-store quiz and how we use it.",
    sections: [
      { h: "Data controller", p: "Suaipe is the controller of the data collected through this kiosk." },
      { h: "Data we collect", p: "First name, last name and email address. Your quiz answers are also recorded and used solely to compute the recommended product." },
      { h: "Purpose", p: "To email you the recommended product, its discount code and the related information. The data is not used for other marketing purposes without further consent." },
      { h: "Legal basis", p: "Processing is based on your explicit consent, given by ticking the box before you start." },
      { h: "Retention", p: "Data is kept only as long as needed for the stated purpose and is purged periodically. You may request deletion at any time." },
      { h: "Processors", p: "Data is hosted on Supabase (infrastructure) and email is sent via Brevo (transactional email); both act as data processors." },
      { h: "Your rights", p: `You may request access, rectification or deletion of your data, and withdraw consent at any time, by writing to ${CONTACT_EMAIL}.` },
    ],
  },
  pt: {
    title: "Política de Privacidade",
    intro:
      "Esta política explica quais os dados que recolhemos através do quiz na loja e como os utilizamos.",
    sections: [
      { h: "Responsável pelo tratamento", p: "A Suaipe é a responsável pelo tratamento dos dados recolhidos através deste quiosque." },
      { h: "Dados recolhidos", p: "Nome, apelido e endereço de email. As suas respostas ao quiz também são registadas e usadas apenas para calcular o produto recomendado." },
      { h: "Finalidade", p: "Enviar-lhe por email o produto recomendado, o respetivo código de desconto e as informações associadas. Os dados não são usados para outras finalidades de marketing sem um consentimento adicional." },
      { h: "Base jurídica", p: "O tratamento baseia-se no seu consentimento explícito, dado ao marcar a caixa antes de começar." },
      { h: "Conservação", p: "Os dados são conservados pelo tempo necessário à finalidade indicada e periodicamente eliminados. Pode solicitar a sua eliminação a qualquer momento." },
      { h: "Subcontratantes", p: "Os dados são alojados na Supabase (infraestrutura) e o email é enviado através da Brevo (email transacional); ambas atuam como subcontratantes." },
      { h: "Os seus direitos", p: `Pode solicitar o acesso, retificação ou eliminação dos seus dados, e retirar o consentimento a qualquer momento, escrevendo para ${CONTACT_EMAIL}.` },
    ],
  },
  es: {
    title: "Política de Privacidad",
    intro:
      "Este aviso explica qué datos recopilamos a través del cuestionario en tienda y cómo los usamos.",
    sections: [
      { h: "Responsable del tratamiento", p: "Suaipe es el responsable del tratamiento de los datos recopilados a través de este quiosco." },
      { h: "Datos recopilados", p: "Nombre, apellido y dirección de correo electrónico. También se registran sus respuestas al cuestionario, utilizadas únicamente para calcular el producto recomendado." },
      { h: "Finalidad", p: "Enviarle por email el producto recomendado, el código de descuento correspondiente y la información asociada. Los datos no se utilizan para otras finalidades de marketing sin un consentimiento adicional." },
      { h: "Base jurídica", p: "El tratamiento se basa en su consentimiento explícito, otorgado al marcar la casilla antes de comenzar." },
      { h: "Conservación", p: "Los datos se conservan durante el tiempo necesario para la finalidad indicada y se eliminan periódicamente. Puede solicitar su eliminación en cualquier momento." },
      { h: "Encargados del tratamiento", p: "Los datos están alojados en Supabase (infraestructura) y el email se envía a través de Brevo (email transaccional); ambas actúan como encargadas del tratamiento." },
      { h: "Sus derechos", p: `Puede solicitar el acceso, la rectificación o la eliminación de sus datos, y retirar el consentimiento en cualquier momento, escribiendo a ${CONTACT_EMAIL}.` },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    intro:
      "Cette notice explique quelles données nous collectons via le quiz en magasin et comment nous les utilisons.",
    sections: [
      { h: "Responsable du traitement", p: "Suaipe est le responsable du traitement des données collectées via ce kiosque." },
      { h: "Données collectées", p: "Prénom, nom et adresse email. Vos réponses au quiz sont également enregistrées et utilisées uniquement pour calculer le produit recommandé." },
      { h: "Finalité", p: "Vous envoyer par email le produit recommandé, le code de réduction correspondant et les informations associées. Les données ne sont pas utilisées à d'autres fins marketing sans un consentement supplémentaire." },
      { h: "Base juridique", p: "Le traitement repose sur votre consentement explicite, donné en cochant la case avant de commencer." },
      { h: "Conservation", p: "Les données sont conservées pendant le temps nécessaire à la finalité indiquée et purgées périodiquement. Vous pouvez en demander la suppression à tout moment." },
      { h: "Sous-traitants", p: "Les données sont hébergées sur Supabase (infrastructure) et l'email est envoyé via Brevo (email transactionnel) ; ils agissent en tant que sous-traitants." },
      { h: "Vos droits", p: `Vous pouvez demander l'accès, la rectification ou la suppression de vos données, et retirer votre consentement à tout moment, en écrivant à ${CONTACT_EMAIL}.` },
    ],
  },
};

// Version recorded with each accepted claim. Keep translations and server contract aligned.
for (const [language, sections] of Object.entries({"it": [["Copie esterne e diagnostica", "Se attivato dal gestore, Google Sheets conserva una copia di nome, cognome, email, prodotto, risultato e negozio. Sentry può ricevere errori tecnici con minimizzazione dei dati; registrazione della sessione e tracciamento prestazioni sono disabilitati."], ["Tempi e cancellazione", "Le sessioni hanno un limite di conservazione di 30 giorni, applicato dalla manutenzione giornaliera. Le richieste di cancellazione includono la verifica delle copie presso Brevo e Google Sheets; il gestore verifica i tempi dei backup e gli eventuali trasferimenti internazionali."]], "en": [["External copies and diagnostics", "If enabled by the operator, Google Sheets holds a copy of name, surname, email, product, result and store. Sentry may receive minimized technical errors; session replay and performance tracing are disabled."], ["Retention and deletion", "Sessions have a 30-day retention limit enforced by daily maintenance. Deletion requests include reconciliation of copies held by Brevo and Google Sheets; the operator verifies backup retention and any international transfers."]], "pt": [["Cópias externas e diagnóstico", "Se ativado pelo responsável, o Google Sheets recebe uma cópia de nome, sobrenome, e-mail, produto, resultado e loja. O Sentry pode receber erros técnicos com minimização de dados; gravação de sessões e rastreamento de desempenho estão desativados."], ["Prazos e exclusão", "As sessões têm limite de conservação de 30 dias, aplicado pela manutenção diária. Os pedidos de exclusão incluem a conferência das cópias na Brevo e no Google Sheets; o responsável verifica os prazos dos backups e eventuais transferências internacionais."]], "es": [["Copias externas y diagnóstico", "Si el responsable lo activa, Google Sheets recibe una copia de nombre, apellidos, email, producto, resultado y tienda. Sentry puede recibir errores técnicos minimizados; la grabación de sesiones y el seguimiento de rendimiento están desactivados."], ["Plazos y eliminación", "Las sesiones tienen un límite de conservación de 30 días, aplicado por mantenimiento diario. Las solicitudes de eliminación incluyen la revisión de copias en Brevo y Google Sheets; el responsable verifica los plazos de las copias de seguridad y las transferencias internacionales."]], "fr": [["Copies externes et diagnostic", "Si activé par le responsable, Google Sheets reçoit une copie du prénom, nom, email, produit, résultat et magasin. Sentry peut recevoir des erreurs techniques minimisées ; la relecture des sessions et le suivi des performances sont désactivés."], ["Délais et suppression", "Les sessions ont une limite de conservation de 30 jours appliquée par maintenance quotidienne. Les demandes de suppression incluent les copies chez Brevo et Google Sheets ; le responsable vérifie la conservation des sauvegardes et les transferts internationaux éventuels."]]})) {
  CONTENT[language as Lang].sections.push(...sections.map(([h,p]) => ({h,p})));
}

export const PrivacyNotice = () => {
  const { lang } = useLang();
  const c = CONTENT[lang] ?? CONTENT.en;

  if (IS_DEMO) return <div className="space-y-4 text-left" data-notice-version={PRIVACY_NOTICE_VERSION}>
    <h1 className="text-lg font-bold">{c.title} · DEMO</h1>
    <p>{CONTROLLER}</p>
    <p>{ {
      it:'Portfolio dimostrativo: usa un visitatore e un catalogo fittizi. Non richiede dati di clienti o credenziali e non invia email né registra autorizzazioni marketing. Le preferenze di lingua restano nel browser; la navigazione e i contenuti possono generare log tecnici presso i servizi di hosting.',
      en:'Portfolio demonstration using a synthetic visitor and catalog. It does not request customer details or credentials, send email, or register marketing permission. Language preferences stay in the browser; page and content requests may generate technical logs at hosting services.',
      pt:'Demonstração de portfólio com visitante e catálogo fictícios. Não solicita dados de clientes ou credenciais, não envia e-mails nem registra autorização de marketing. Preferências de idioma ficam no navegador; acessos às páginas e conteúdos podem gerar logs técnicos nos serviços de hospedagem.',
      es:'Demostración de portafolio con visitante y catálogo ficticios. No solicita datos de clientes ni credenciales, no envía correos ni registra permiso de marketing. El idioma se guarda en el navegador; las páginas y contenidos pueden generar registros técnicos en el alojamiento.',
      fr:'Démonstration de portfolio avec visiteur et catalogue fictifs. Elle ne demande ni données clients ni identifiants, n’envoie aucun email et n’enregistre aucun consentement marketing. La langue reste dans le navigateur ; les pages et contenus peuvent générer des journaux techniques chez les hébergeurs.',
    }[lang]}</p>
    <p>{CONTACT_EMAIL} · { {it:'esempio fittizio, non monitorato',en:'fictitious example, not monitored',pt:'exemplo fictício, não monitorado',es:'ejemplo ficticio, sin supervisión',fr:'exemple fictif, non surveillé'}[lang] }</p>
  </div>;

  return (
    <div className="space-y-4 text-left" data-notice-version={PRIVACY_NOTICE_VERSION}>
      {IS_DEMO && <p className="rounded border border-border p-3">DEMO · { {it:'Dati fittizi',en:'Synthetic data',pt:'Dados fictícios',es:'Datos ficticios',fr:'Données fictives'}[lang] }</p>}
      <h1 className="text-lg font-bold text-foreground">{c.title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{c.intro}</p>
      <div className="space-y-3">
        {c.sections.map((s,index) => (
          <div key={s.h}>
            <h2 className="text-sm font-semibold text-foreground">{s.h}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{index === 0 ? CONTROLLER : s.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
