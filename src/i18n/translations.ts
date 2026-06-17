export type Lang = "it" | "en" | "pt" | "es" | "fr";

export interface T {
  splash: {
    headline: string;
    sub: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    tap: string;
    chooseLang: string;
  };
  welcome: {
    tagline: string;
    firstName: string;
    lastName: string;
    emailPlaceholder: string;
    firstNameError: string;
    lastNameError: string;
    emailError: string;
    cooldownError: (hours: number) => string;
    cta: string;
    subtitle: string;
    noStore: string;
    catalogOffline: string;
    offlineBanner: string;
    privacy: string;
    noSpam: string;
    consentLabel: string;
    consentRead: string;
    consentRequired: string;
  };
  quiz: {
    questionOf: (current: number, total: number) => string;
    chooseDestiny: string;
    loadingCards: string;
    loadingCardsSub: string;
  };
  tutorial: {
    header: string;
    no: string;
    yes: string;
    ready: string;
  };
  swipe: {
    yes: string;
    no: string;
  };
  result: {
    gadgetIntro: (name: string) => string;
    scanning: string;
    match: string;
    perfectMatch: string;
    video: string;
    manual: string;
    discount: string;
    cta: string;
    emailSubtitle: string;
    productImageAlt: string;
    sendTo: string;
    changeEmail: string;
  };
  changeEmail: {
    accessTitle: string;
    pinPrompt: string;
    pinError: string;
    tooManyAttempts: (seconds: number) => string;
    verifying: string;
    editTitle: string;
    currentEmail: string;
    newEmailPlaceholder: string;
    emailInvalid: string;
    save: string;
    cancel: string;
    emailHint: string;
    connectionError: string;
  };
  categories: Record<string, string>;
  success: {
    title: (name: string) => string;
    titleNoName: string;
    productOnWay: string;
    recipient: string;
    spamNote: string;
    restart: string;
    benefits: {
      video: { title: string; desc: string };
      manual: { title: string; desc: string };
      faq: { title: string; desc: string };
      discount: { title: string; desc: string };
    };
  };
  inactivity: {
    title: string;
    countdown: string;
    dismiss: string;
    restart: string;
  };
  attract: {
    swipes: string;
    minutes: string;
    perfect: string;
  };
  // Staff-facing surfaces (admin overlay, kiosk lock screen, error boundary).
  // English-first because non-Italian stores need readable copy too.
  admin: {
    storeStep: {
      title: string;
      subtitle: string;
      saveAndReturn: string;
      goToAnalytics: string;
      goToConsulente: string;
      kioskActive: string;
      kioskInactive: string;
      kioskActiveDesc: string;
      kioskInactiveDesc: string;
      kioskInstallHint: string;
      deactivate: string;
      activate: string;
    };
    pinStep: {
      title: string;
      subtitle: string;
      cancel: string;
    };
    kioskLock: {
      pinTitle: string;
      pinSubtitle: string;
      lockTitle: string;
      lockSubtitle: string;
      startQuiz: string;
      deactivateKiosk: string;
      tooManyAttempts: (s: number) => string;
      verifying: string;
      cancel: string;
    };
    errorBoundary: {
      title: string;
      subtitle: string;
      reload: string;
    };
  };
  questions: Record<number, string>;
}

export const LANGUAGES: { code: Lang; flag: string; label: string; name: string }[] = [
  { code: "it", flag: "🇮🇹", label: "IT", name: "Italiano" },
  { code: "en", flag: "🇬🇧", label: "EN", name: "English" },
  { code: "pt", flag: "🇧🇷", label: "PT", name: "Português" },
  { code: "es", flag: "🇪🇸", label: "ES", name: "Español" },
  { code: "fr", flag: "🇫🇷", label: "FR", name: "Français" },
];

export const translations: Record<Lang, T> = {
  // ── ITALIANO ──────────────────────────────────────────────────────────────
  it: {
    splash: {
      headline: "Trova il tuo gadget tech ideale",
      sub: "in soli 8 swipe",
      step1: "Il prodotto perfetto per te",
      step2: "L'idea regalo ideale",
      step3: "Il gadget che stavi cercando",
      step4: "Il tuo match tech personale",
      tap: "Tocca per iniziare",
      chooseLang: "Scegli la lingua",
    },
    welcome: {
      tagline: "Trova il tuo gadget perfetto! 🎯",
      firstName: "Nome",
      lastName: "Cognome",
      emailPlaceholder: "La tua email",
      firstNameError: "Inserisci il nome",
      lastNameError: "Inserisci il cognome",
      emailError: "Per favore, inserisci un'email valida.",
      cooldownError: (h) => `Hai già partecipato di recente. Riprova tra ${h} ore.`,
      cta: "🚀 INIZIA IL GIOCO!",
      subtitle: "Rispondi a 8 domande veloci e scopri il tuo match perfetto",
      noStore: "Sede non configurata",
      catalogOffline: "⚠ Catalogo offline — verifica connessione",
      offlineBanner: "⚠ Connessione assente — il quiz funziona ma le email non verranno inviate",
      privacy: "Dati protetti · Conformità GDPR",
      noSpam: "Niente spam. Puoi cancellarti in qualsiasi momento.",
      consentLabel: "Accetto l'informativa sulla privacy",
      consentRead: "Leggi",
      consentRequired: "Devi accettare l'informativa per continuare",
    },
    quiz: {
      questionOf: (c, t) => `Domanda ${c} di ${t}`,
      chooseDestiny: "SCEGLI IL TUO DESTINO",
      loadingCards: "Stiamo mischiando le carte…",
      loadingCardsSub: "Preparati a rispondere a qualche domanda!",
    },
    tutorial: {
      header: "Come funziona?",
      no: "← Swipe per NO",
      yes: "Swipe per SÌ →",
      ready: "Sono pronto!",
    },
    swipe: { yes: "SÌ", no: "NO" },
    result: {
      gadgetIntro: (n) => `${n ? n + "," : ""} il tuo gadget ideale è...`,
      scanning: "analisi...",
      match: "match",
      perfectMatch: "🎉 MATCH PERFETTO!",
      video: "Video 30s",
      manual: "Manuale",
      discount: "Sconto VIP",
      cta: "🎁 Voglio riceverlo!",
      emailSubtitle: "Ricevi video, manuale, FAQ e sconto esclusivo via email",
      productImageAlt: "Immagine prodotto",
      sendTo: "Il match verrà inviato a:",
      changeEmail: "Cambia email",
    },
    changeEmail: {
      accessTitle: "Accesso consulente",
      pinPrompt: "Inserisci il PIN per modificare l'email",
      pinError: "PIN non corretto",
      tooManyAttempts: (s) => `Troppi tentativi — riprova tra ${s}s`,
      verifying: "Verifica…",
      editTitle: "Modifica email",
      currentEmail: "Email attuale:",
      newEmailPlaceholder: "nuova@email.com",
      emailInvalid: "Email non valida",
      save: "Salva email",
      cancel: "Annulla",
      emailHint: "Email non corretta? Chiedi a un consulente presente in negozio di modificarla.",
      connectionError: "Errore di connessione — riprova tra qualche secondo.",
    },
    categories: {
      sport: "Sport", audio: "Audio", productivity: "Produttività",
      wellness: "Benessere", travel: "Viaggio", tech: "Tech",
      style: "Stile", recovery: "Recupero",
    },
    success: {
      title: (n) => `Perfetto, ${n}!`,
      titleNoName: "Complimenti!",
      productOnWay: "Il tuo pacchetto esclusivo è in arrivo a:",
      recipient: "Destinatario",
      spamNote: "Non vedi l'email? Controlla anche la cartella spam.",
      restart: "🔄 Gioca di Nuovo",
      benefits: {
        video:    { title: "Video esclusivo",  desc: "Il consulente ti spiega tutto in 30 secondi" },
        manual:   { title: "Manuale completo", desc: "Guida passo-passo per iniziare subito" },
        faq:      { title: "FAQ",              desc: "Risposte alle domande più frequenti" },
        discount: { title: "Sconto speciale",  desc: "Riservato solo a chi ha giocato oggi!" },
      },
    },
    inactivity: {
      title: "Sei ancora lì?",
      countdown: "Il quiz si azzererà tra",
      dismiss: "Sono ancora qui! Continua →",
      restart: "Ricomincia dall'inizio",
    },
    attract: {
      swipes: "8 swipe",
      minutes: "2 min",
      perfect: "match perfetto ✓",
    },
    admin: {
      storeStep: {
        title: "Seleziona la Sede",
        subtitle: "Scegli la sede in cui si trova questo iPad",
        saveAndReturn: "✓ Salva sede e torna al quiz",
        goToAnalytics: "📊 Vai ad Analytics / Manager",
        goToConsulente: "🎓 Formazione Consulenti",
        kioskActive: "🔒 Modalità Kiosk Attiva",
        kioskInactive: "🔓 Modalità Kiosk",
        kioskActiveDesc: "Schermo a tutto schermo — barra indirizzi nascosta",
        kioskInactiveDesc: "Attiva per nascondere la barra del browser",
        kioskInstallHint: "⚠ Per digitare (email, nome) senza uscire dal kiosk: aggiungi l'app alla Home dell'iPad — Condividi → \"Aggiungi a Home\" — e aprila da quell'icona.",
        deactivate: "Disattiva",
        activate: "Attiva",
      },
      pinStep: {
        title: "Accesso Staff",
        subtitle: "Inserisci il PIN per accedere",
        cancel: "Annulla",
      },
      kioskLock: {
        pinTitle: "Disattiva Modalità Kiosk",
        pinSubtitle: "Inserisci il PIN staff per disattivare",
        lockTitle: "Schermo Bloccato",
        lockSubtitle: "Questo iPad è in modalità kiosk",
        startQuiz: "▶ Avvia il Quiz",
        deactivateKiosk: "Disattiva Modalità Kiosk",
        tooManyAttempts: (s) => `Troppi tentativi. Riprova tra ${s}s`,
        verifying: "Verifica in corso…",
        cancel: "Annulla",
      },
      errorBoundary: {
        title: "Il sistema è momentaneamente offline",
        subtitle: "Stiamo lavorando per ripristinarlo. Tornerà operativo a breve — nessuna azione richiesta.",
        reload: "Ricarica",
      },
    },
    questions: {
      1: "Ti alleni regolarmente o pratichi sport?",
      2: "La musica è sempre con te, anche durante l'allenamento?",
      3: "Cerchi sempre modi per ottimizzare il tuo tempo?",
      4: "Dedichi ogni giorno del tempo alla cura di te stesso?",
      5: "Sei spesso in movimento o viaggi fuori casa?",
      6: "Ami i gadget smart che tracciano salute e attività?",
      7: "Il design e l'estetica degli oggetti contano tanto per te?",
      8: "Il recupero fisico e il sonno di qualità sono una priorità?",
    },
  },

  // ── ENGLISH ───────────────────────────────────────────────────────────────
  en: {
    splash: {
      headline: "Find your ideal tech gadget",
      sub: "in just 8 swipes",
      step1: "The perfect product for you",
      step2: "The ideal gift idea",
      step3: "The gadget you were looking for",
      step4: "Your personal tech match",
      tap: "Tap to start",
      chooseLang: "Choose language",
    },
    welcome: {
      tagline: "Find your perfect gadget! 🎯",
      firstName: "First name",
      lastName: "Last name",
      emailPlaceholder: "Your email",
      firstNameError: "Enter your first name",
      lastNameError: "Enter your last name",
      emailError: "Please enter a valid email address.",
      cooldownError: (h) => `You've already played recently. Try again in ${h} hours.`,
      cta: "🚀 START THE GAME!",
      subtitle: "Answer 8 quick questions and find your perfect match",
      noStore: "Store not configured",
      catalogOffline: "⚠ Catalog offline — check connection",
      offlineBanner: "⚠ No connection — the quiz works but emails won't be sent",
      privacy: "Secure data · GDPR compliant",
      noSpam: "No spam. Unsubscribe anytime.",
      consentLabel: "I accept the privacy notice",
      consentRead: "Read",
      consentRequired: "You must accept the privacy notice to continue",
    },
    quiz: {
      questionOf: (c, t) => `Question ${c} of ${t}`,
      chooseDestiny: "CHOOSE YOUR DESTINY",
      loadingCards: "Shuffling the cards…",
      loadingCardsSub: "Get ready to answer a few questions!",
    },
    tutorial: {
      header: "How does it work?",
      no: "← Swipe for NO",
      yes: "Swipe for YES →",
      ready: "I'm ready!",
    },
    swipe: { yes: "YES", no: "NO" },
    result: {
      gadgetIntro: (n) => `${n ? n + "," : ""} your ideal gadget is...`,
      scanning: "scanning...",
      match: "match",
      perfectMatch: "🎉 PERFECT MATCH!",
      video: "Video 30s",
      manual: "Manual",
      discount: "VIP Discount",
      cta: "🎁 I want it!",
      emailSubtitle: "Receive the video, manual, FAQ and exclusive discount by email",
      productImageAlt: "Product image",
      sendTo: "Your match will be sent to:",
      changeEmail: "Change email",
    },
    changeEmail: {
      accessTitle: "Consultant access",
      pinPrompt: "Enter the PIN to change the email",
      pinError: "Incorrect PIN",
      tooManyAttempts: (s) => `Too many attempts — try again in ${s}s`,
      verifying: "Verifying…",
      editTitle: "Edit email",
      currentEmail: "Current email:",
      newEmailPlaceholder: "new@email.com",
      emailInvalid: "Invalid email",
      save: "Save email",
      cancel: "Cancel",
      emailHint: "Incorrect email? Ask a store consultant to change it.",
      connectionError: "Connection error — please try again in a moment.",
    },
    categories: {
      sport: "Sport", audio: "Audio", productivity: "Productivity",
      wellness: "Wellness", travel: "Travel", tech: "Tech",
      style: "Style", recovery: "Recovery",
    },
    success: {
      title: (n) => `Perfect, ${n}!`,
      titleNoName: "Congratulations!",
      productOnWay: "Your exclusive package is on its way to:",
      recipient: "Recipient",
      spamNote: "Can't find the email? Check your spam folder too.",
      restart: "🔄 Play Again",
      benefits: {
        video:    { title: "Exclusive video",   desc: "Our consultant explains everything in 30 seconds" },
        manual:   { title: "Full manual",       desc: "Step-by-step guide to get started right away" },
        faq:      { title: "FAQ",               desc: "Answers to the most common questions" },
        discount: { title: "Special discount",  desc: "Reserved only for today's players!" },
      },
    },
    inactivity: {
      title: "Still there?",
      countdown: "The quiz will reset in",
      dismiss: "I'm still here! Continue →",
      restart: "Restart from the beginning",
    },
    attract: {
      swipes: "8 swipes",
      minutes: "2 min",
      perfect: "perfect match ✓",
    },
    admin: {
      storeStep: {
        title: "Select Store",
        subtitle: "Choose the store where this iPad is located",
        saveAndReturn: "✓ Save store and return to quiz",
        goToAnalytics: "📊 Open Analytics / Manager",
        goToConsulente: "🎓 Consultant Training",
        kioskActive: "🔒 Kiosk Mode Active",
        kioskInactive: "🔓 Kiosk Mode",
        kioskActiveDesc: "Full-screen — browser address bar hidden",
        kioskInactiveDesc: "Activate to hide the browser bar",
        kioskInstallHint: "⚠ To type (email, name) without breaking kiosk mode: add the app to the iPad Home Screen — Share → \"Add to Home Screen\" — and open it from that icon.",
        deactivate: "Deactivate",
        activate: "Activate",
      },
      pinStep: {
        title: "Staff Access",
        subtitle: "Enter the PIN to continue",
        cancel: "Cancel",
      },
      kioskLock: {
        pinTitle: "Disable Kiosk Mode",
        pinSubtitle: "Enter the staff PIN to disable",
        lockTitle: "Screen Locked",
        lockSubtitle: "This iPad is in kiosk mode",
        startQuiz: "▶ Start the Quiz",
        deactivateKiosk: "Disable Kiosk Mode",
        tooManyAttempts: (s) => `Too many attempts. Try again in ${s}s`,
        verifying: "Verifying…",
        cancel: "Cancel",
      },
      errorBoundary: {
        title: "The system is temporarily offline",
        subtitle: "We're restoring it. It will be back shortly — no action required.",
        reload: "Reload",
      },
    },
    questions: {
      1: "Do you exercise or play sports regularly?",
      2: "Is music always with you, even during workouts?",
      3: "Do you always look for ways to optimize your time?",
      4: "Do you dedicate time every day to taking care of yourself?",
      5: "Are you always on the move or traveling?",
      6: "Do you love smart gadgets that track health and activity?",
      7: "Do design and aesthetics matter a lot to you?",
      8: "Are physical recovery and quality sleep a priority?",
    },
  },

  // ── PORTUGUÊS ─────────────────────────────────────────────────────────────
  pt: {
    splash: {
      headline: "Encontre o seu gadget tech ideal",
      sub: "em apenas 8 swipes",
      step1: "O produto perfeito para você",
      step2: "A ideia de presente ideal",
      step3: "O gadget que você procurava",
      step4: "O seu match tech pessoal",
      tap: "Toque para começar",
      chooseLang: "Escolher idioma",
    },
    welcome: {
      tagline: "Encontre o seu gadget perfeito! 🎯",
      firstName: "Nome",
      lastName: "Sobrenome",
      emailPlaceholder: "O seu email",
      firstNameError: "Insira o seu nome",
      lastNameError: "Insira o seu sobrenome",
      emailError: "Por favor, insira um email válido.",
      cooldownError: (h) => `Você já participou recentemente. Tente novamente em ${h} horas.`,
      cta: "🚀 COMEÇAR O JOGO!",
      subtitle: "Responda a 8 perguntas rápidas e descubra o seu match perfeito",
      noStore: "Loja não configurada",
      catalogOffline: "⚠ Catálogo offline — verifique a conexão",
      offlineBanner: "⚠ Sem conexão — o quiz funciona mas os e-mails não serão enviados",
      privacy: "Dados protegidos · Conformidade GDPR",
      noSpam: "Sem spam. Pode cancelar a qualquer momento.",
      consentLabel: "Aceito a política de privacidade",
      consentRead: "Ler",
      consentRequired: "Você precisa aceitar a política de privacidade para continuar",
    },
    quiz: {
      questionOf: (c, t) => `Pergunta ${c} de ${t}`,
      chooseDestiny: "ESCOLHA O SEU DESTINO",
      loadingCards: "Estamos embaralhando as cartas…",
      loadingCardsSub: "Prepare-se para responder algumas perguntinhas!",
    },
    tutorial: {
      header: "Como funciona?",
      no: "← Swipe para NÃO",
      yes: "Swipe para SIM →",
      ready: "Estou pronto!",
    },
    swipe: { yes: "SIM", no: "NÃO" },
    result: {
      gadgetIntro: (n) => `${n ? n + "," : ""} o seu gadget ideal é...`,
      scanning: "analisando...",
      match: "match",
      perfectMatch: "🎉 MATCH PERFEITO!",
      video: "Vídeo 30s",
      manual: "Manual",
      discount: "Desconto VIP",
      cta: "🎁 Quero receber!",
      emailSubtitle: "Receba o vídeo, manual, FAQ e desconto exclusivo por email",
      productImageAlt: "Imagem do produto",
      sendTo: "O match será enviado para:",
      changeEmail: "Alterar email",
    },
    changeEmail: {
      accessTitle: "Acesso do consultor",
      pinPrompt: "Insira o PIN para alterar o email",
      pinError: "PIN incorreto",
      tooManyAttempts: (s) => `Muitas tentativas — tente novamente em ${s}s`,
      verifying: "Verificando…",
      editTitle: "Alterar email",
      currentEmail: "Email atual:",
      newEmailPlaceholder: "novo@email.com",
      emailInvalid: "Email inválido",
      save: "Salvar email",
      cancel: "Cancelar",
      emailHint: "Email incorreto? Peça a um consultor na loja para alterá-lo.",
      connectionError: "Erro de conexão — tente novamente em instantes.",
    },
    categories: {
      sport: "Esporte", audio: "Áudio", productivity: "Produtividade",
      wellness: "Bem-estar", travel: "Viagem", tech: "Tech",
      style: "Estilo", recovery: "Recuperação",
    },
    success: {
      title: (n) => `Perfeito, ${n}!`,
      titleNoName: "Parabéns!",
      productOnWay: "O seu pacote exclusivo está a caminho de:",
      recipient: "Destinatário",
      spamNote: "Não encontrou o email? Verifique também a pasta de spam.",
      restart: "🔄 Jogar Novamente",
      benefits: {
        video:    { title: "Vídeo exclusivo",  desc: "O consultor explica tudo em 30 segundos" },
        manual:   { title: "Manual completo",  desc: "Guia passo a passo para começar já" },
        faq:      { title: "FAQ",              desc: "Respostas às perguntas mais frequentes" },
        discount: { title: "Desconto especial", desc: "Reservado só para quem jogou hoje!" },
      },
    },
    inactivity: {
      title: "Ainda está aí?",
      countdown: "O quiz será reiniciado em",
      dismiss: "Ainda estou aqui! Continuar →",
      restart: "Recomeçar do início",
    },
    attract: {
      swipes: "8 swipes",
      minutes: "2 min",
      perfect: "match perfeito ✓",
    },
    admin: {
      storeStep: {
        title: "Selecionar Loja",
        subtitle: "Escolha a loja onde este iPad está",
        saveAndReturn: "✓ Salvar loja e voltar ao quiz",
        goToAnalytics: "📊 Ir para Analytics / Manager",
        goToConsulente: "🎓 Formação Consultores",
        kioskActive: "🔒 Modo Kiosk Ativo",
        kioskInactive: "🔓 Modo Kiosk",
        kioskActiveDesc: "Tela cheia — barra de endereço oculta",
        kioskInactiveDesc: "Ativar para ocultar a barra do navegador",
        kioskInstallHint: "⚠ Para digitar (email, nome) sem quebrar o modo kiosk: adicione o app à Tela de Início do iPad — Compartilhar → \"Adicionar à Tela de Início\" — e abra por esse ícone.",
        deactivate: "Desativar",
        activate: "Ativar",
      },
      pinStep: {
        title: "Acesso Staff",
        subtitle: "Insira o PIN para continuar",
        cancel: "Cancelar",
      },
      kioskLock: {
        pinTitle: "Desativar Modo Kiosk",
        pinSubtitle: "Insira o PIN do staff para desativar",
        lockTitle: "Tela Bloqueada",
        lockSubtitle: "Este iPad está em modo kiosk",
        startQuiz: "▶ Iniciar o Quiz",
        deactivateKiosk: "Desativar Modo Kiosk",
        tooManyAttempts: (s) => `Muitas tentativas. Tente novamente em ${s}s`,
        verifying: "Verificando…",
        cancel: "Cancelar",
      },
      errorBoundary: {
        title: "O sistema está temporariamente offline",
        subtitle: "Estamos restaurando o sistema. Voltará em breve — nenhuma ação necessária.",
        reload: "Recarregar",
      },
    },
    questions: {
      1: "Você pratica esportes ou se exercita regularmente?",
      2: "A música está sempre com você, mesmo durante os treinos?",
      3: "Você sempre busca formas de otimizar seu tempo?",
      4: "Você dedica tempo todos os dias ao autocuidado?",
      5: "Você está sempre em movimento ou viajando?",
      6: "Você ama gadgets smart que monitoram saúde e atividade?",
      7: "Design e estética são importantes para você?",
      8: "Recuperação física e qualidade do sono são prioridades?",
    },
  },

  // ── ESPAÑOL ───────────────────────────────────────────────────────────────
  es: {
    splash: {
      headline: "Encuentra tu gadget tech ideal",
      sub: "en solo 8 swipes",
      step1: "El producto perfecto para ti",
      step2: "La idea de regalo ideal",
      step3: "El gadget que buscabas",
      step4: "Tu match tech personal",
      tap: "Toca para empezar",
      chooseLang: "Elegir idioma",
    },
    welcome: {
      tagline: "¡Encuentra tu gadget perfecto! 🎯",
      firstName: "Nombre",
      lastName: "Apellido",
      emailPlaceholder: "Tu email",
      firstNameError: "Introduce tu nombre",
      lastNameError: "Introduce tu apellido",
      emailError: "Por favor, introduce un email válido.",
      cooldownError: (h) => `Ya has participado recientemente. Inténtalo de nuevo en ${h} horas.`,
      cta: "🚀 ¡EMPEZAR EL JUEGO!",
      subtitle: "Responde 8 preguntas rápidas y descubre tu match perfecto",
      noStore: "Tienda no configurada",
      catalogOffline: "⚠ Catálogo sin conexión — comprueba la red",
      offlineBanner: "⚠ Sin conexión — el quiz funciona pero no se enviarán emails",
      privacy: "Datos protegidos · Cumplimiento RGPD",
      noSpam: "Sin spam. Puedes darte de baja en cualquier momento.",
      consentLabel: "Acepto la política de privacidad",
      consentRead: "Leer",
      consentRequired: "Debes aceptar la política de privacidad para continuar",
    },
    quiz: {
      questionOf: (c, t) => `Pregunta ${c} de ${t}`,
      chooseDestiny: "ELIGE TU DESTINO",
      loadingCards: "Mezclando las cartas…",
      loadingCardsSub: "¡Prepárate para responder algunas preguntas!",
    },
    tutorial: {
      header: "¿Cómo funciona?",
      no: "← Swipe para NO",
      yes: "Swipe para SÍ →",
      ready: "¡Estoy listo!",
    },
    swipe: { yes: "SÍ", no: "NO" },
    result: {
      gadgetIntro: (n) => `${n ? n + "," : ""} tu gadget ideal es...`,
      scanning: "analizando...",
      match: "match",
      perfectMatch: "🎉 ¡MATCH PERFECTO!",
      video: "Vídeo 30s",
      manual: "Manual",
      discount: "Descuento VIP",
      cta: "🎁 ¡Lo quiero!",
      emailSubtitle: "Recibe el vídeo, manual, FAQ y descuento exclusivo por email",
      productImageAlt: "Imagen del producto",
      sendTo: "El match se enviará a:",
      changeEmail: "Cambiar email",
    },
    changeEmail: {
      accessTitle: "Acceso del consultor",
      pinPrompt: "Introduce el PIN para cambiar el email",
      pinError: "PIN incorrecto",
      tooManyAttempts: (s) => `Demasiados intentos — inténtalo de nuevo en ${s}s`,
      verifying: "Verificando…",
      editTitle: "Editar email",
      currentEmail: "Email actual:",
      newEmailPlaceholder: "nuevo@email.com",
      emailInvalid: "Email no válido",
      save: "Guardar email",
      cancel: "Cancelar",
      emailHint: "¿Email incorrecto? Pide a un consultor en tienda que lo cambie.",
      connectionError: "Error de conexión — vuelve a intentarlo en un momento.",
    },
    categories: {
      sport: "Deporte", audio: "Audio", productivity: "Productividad",
      wellness: "Bienestar", travel: "Viaje", tech: "Tech",
      style: "Estilo", recovery: "Recuperación",
    },
    success: {
      title: (n) => `¡Perfecto, ${n}!`,
      titleNoName: "¡Felicidades!",
      productOnWay: "Tu paquete exclusivo está en camino a:",
      recipient: "Destinatario",
      spamNote: "¿No ves el email? Revisa también la carpeta de spam.",
      restart: "🔄 Jugar de Nuevo",
      benefits: {
        video:    { title: "Vídeo exclusivo",    desc: "Nuestro consultor te explica todo en 30 segundos" },
        manual:   { title: "Manual completo",    desc: "Guía paso a paso para empezar ya" },
        faq:      { title: "FAQ",                desc: "Respuestas a las preguntas más frecuentes" },
        discount: { title: "Descuento especial", desc: "¡Solo para quienes han jugado hoy!" },
      },
    },
    inactivity: {
      title: "¿Sigues ahí?",
      countdown: "El quiz se reiniciará en",
      dismiss: "¡Sigo aquí! Continuar →",
      restart: "Volver a empezar desde el inicio",
    },
    attract: {
      swipes: "8 swipes",
      minutes: "2 min",
      perfect: "match perfecto ✓",
    },
    admin: {
      storeStep: {
        title: "Seleccionar Tienda",
        subtitle: "Elige la tienda donde está este iPad",
        saveAndReturn: "✓ Guardar tienda y volver al quiz",
        goToAnalytics: "📊 Ir a Analytics / Manager",
        goToConsulente: "🎓 Formación Consultores",
        kioskActive: "🔒 Modo Kiosk Activo",
        kioskInactive: "🔓 Modo Kiosk",
        kioskActiveDesc: "Pantalla completa — barra de direcciones oculta",
        kioskInactiveDesc: "Activa para ocultar la barra del navegador",
        kioskInstallHint: "⚠ Para escribir (email, nombre) sin romper el modo kiosk: añade la app a la pantalla de inicio del iPad — Compartir → \"Añadir a inicio\" — y ábrela desde ese icono.",
        deactivate: "Desactivar",
        activate: "Activar",
      },
      pinStep: {
        title: "Acceso Staff",
        subtitle: "Introduce el PIN para continuar",
        cancel: "Cancelar",
      },
      kioskLock: {
        pinTitle: "Desactivar Modo Kiosk",
        pinSubtitle: "Introduce el PIN del staff para desactivar",
        lockTitle: "Pantalla Bloqueada",
        lockSubtitle: "Este iPad está en modo kiosk",
        startQuiz: "▶ Iniciar el Quiz",
        deactivateKiosk: "Desactivar Modo Kiosk",
        tooManyAttempts: (s) => `Demasiados intentos. Inténtalo de nuevo en ${s}s`,
        verifying: "Verificando…",
        cancel: "Cancelar",
      },
      errorBoundary: {
        title: "El sistema está temporalmente fuera de línea",
        subtitle: "Lo estamos restaurando. Volverá pronto — no se requiere ninguna acción.",
        reload: "Recargar",
      },
    },
    questions: {
      1: "¿Practicas deporte o haces ejercicio regularmente?",
      2: "¿La música siempre te acompaña, incluso en tus entrenamientos?",
      3: "¿Siempre buscas formas de optimizar tu tiempo?",
      4: "¿Dedicas tiempo cada día al cuidado personal?",
      5: "¿Siempre estás en movimiento o de viaje?",
      6: "¿Te gustan los gadgets smart que monitorizan salud y actividad?",
      7: "¿El diseño y la estética son importantes para ti?",
      8: "¿La recuperación física y el sueño de calidad son prioridades?",
    },
  },

  // ── FRANÇAIS ──────────────────────────────────────────────────────────────
  fr: {
    splash: {
      headline: "Trouvez votre gadget tech idéal",
      sub: "en seulement 8 swipes",
      step1: "Le produit parfait pour vous",
      step2: "L'idée cadeau idéale",
      step3: "Le gadget que vous cherchiez",
      step4: "Votre match tech personnel",
      tap: "Touchez pour commencer",
      chooseLang: "Choisir la langue",
    },
    welcome: {
      tagline: "Trouvez votre gadget parfait ! 🎯",
      firstName: "Prénom",
      lastName: "Nom",
      emailPlaceholder: "Votre email",
      firstNameError: "Entrez votre prénom",
      lastNameError: "Entrez votre nom",
      emailError: "Veuillez entrer une adresse email valide.",
      cooldownError: (h) => `Vous avez déjà participé récemment. Réessayez dans ${h} heures.`,
      cta: "🚀 COMMENCER LE JEU !",
      subtitle: "Répondez à 8 questions rapides et découvrez votre match parfait",
      noStore: "Boutique non configurée",
      catalogOffline: "⚠ Catalogue hors ligne — vérifiez la connexion",
      offlineBanner: "⚠ Pas de connexion — le quiz fonctionne mais les emails ne seront pas envoyés",
      privacy: "Données protégées · Conformité RGPD",
      noSpam: "Aucun spam. Désinscription possible à tout moment.",
      consentLabel: "J'accepte la politique de confidentialité",
      consentRead: "Lire",
      consentRequired: "Vous devez accepter la politique pour continuer",
    },
    quiz: {
      questionOf: (c, t) => `Question ${c} sur ${t}`,
      chooseDestiny: "CHOISISSEZ VOTRE DESTIN",
      loadingCards: "On mélange les cartes…",
      loadingCardsSub: "Préparez-vous à répondre à quelques questions !",
    },
    tutorial: {
      header: "Comment ça marche ?",
      no: "← Swipe pour NON",
      yes: "Swipe pour OUI →",
      ready: "Je suis prêt !",
    },
    swipe: { yes: "OUI", no: "NON" },
    result: {
      gadgetIntro: (n) => `${n ? n + "," : ""} votre gadget idéal est...`,
      scanning: "analyse...",
      match: "match",
      perfectMatch: "🎉 MATCH PARFAIT !",
      video: "Vidéo 30s",
      manual: "Manuel",
      discount: "Remise VIP",
      cta: "🎁 Je le veux !",
      emailSubtitle: "Recevez la vidéo, le manuel, la FAQ et la remise exclusive par email",
      productImageAlt: "Image du produit",
      sendTo: "Le match sera envoyé à :",
      changeEmail: "Changer l'email",
    },
    changeEmail: {
      accessTitle: "Accès consultant",
      pinPrompt: "Entrez le PIN pour modifier l'email",
      pinError: "PIN incorrect",
      tooManyAttempts: (s) => `Trop de tentatives — réessayez dans ${s}s`,
      verifying: "Vérification…",
      editTitle: "Modifier l'email",
      currentEmail: "Email actuel :",
      newEmailPlaceholder: "nouveau@email.com",
      emailInvalid: "Email invalide",
      save: "Enregistrer l'email",
      cancel: "Annuler",
      emailHint: "Email incorrect ? Demandez à un consultant en magasin de le modifier.",
      connectionError: "Erreur de connexion — réessayez dans un instant.",
    },
    categories: {
      sport: "Sport", audio: "Audio", productivity: "Productivité",
      wellness: "Bien-être", travel: "Voyage", tech: "Tech",
      style: "Style", recovery: "Récupération",
    },
    success: {
      title: (n) => `Parfait, ${n} !`,
      titleNoName: "Félicitations !",
      productOnWay: "Votre colis exclusif est en route vers :",
      recipient: "Destinataire",
      spamNote: "Vous ne trouvez pas l'email ? Vérifiez aussi le dossier spam.",
      restart: "🔄 Rejouer",
      benefits: {
        video:    { title: "Vidéo exclusive",  desc: "Notre consultant vous explique tout en 30 secondes" },
        manual:   { title: "Manuel complet",   desc: "Guide étape par étape pour commencer tout de suite" },
        faq:      { title: "FAQ",              desc: "Réponses aux questions les plus fréquentes" },
        discount: { title: "Remise spéciale",  desc: "Réservée uniquement aux joueurs d'aujourd'hui !" },
      },
    },
    inactivity: {
      title: "Vous êtes encore là ?",
      countdown: "Le quiz sera réinitialisé dans",
      dismiss: "Je suis encore là ! Continuer →",
      restart: "Recommencer depuis le début",
    },
    attract: {
      swipes: "8 swipes",
      minutes: "2 min",
      perfect: "match parfait ✓",
    },
    admin: {
      storeStep: {
        title: "Sélectionner la Boutique",
        subtitle: "Choisissez la boutique où se trouve cet iPad",
        saveAndReturn: "✓ Enregistrer la boutique et revenir au quiz",
        goToAnalytics: "📊 Ouvrir Analytics / Manager",
        goToConsulente: "🎓 Formation Consultants",
        kioskActive: "🔒 Mode Kiosk Actif",
        kioskInactive: "🔓 Mode Kiosk",
        kioskActiveDesc: "Plein écran — barre d'adresse masquée",
        kioskInactiveDesc: "Activez pour masquer la barre du navigateur",
        kioskInstallHint: "⚠ Pour saisir (email, nom) sans casser le mode kiosk : ajoutez l'app à l'écran d'accueil de l'iPad — Partager → \"Sur l'écran d'accueil\" — et ouvrez-la depuis cette icône.",
        deactivate: "Désactiver",
        activate: "Activer",
      },
      pinStep: {
        title: "Accès Staff",
        subtitle: "Entrez le PIN pour continuer",
        cancel: "Annuler",
      },
      kioskLock: {
        pinTitle: "Désactiver le Mode Kiosk",
        pinSubtitle: "Entrez le PIN staff pour désactiver",
        lockTitle: "Écran Verrouillé",
        lockSubtitle: "Cet iPad est en mode kiosk",
        startQuiz: "▶ Démarrer le Quiz",
        deactivateKiosk: "Désactiver le Mode Kiosk",
        tooManyAttempts: (s) => `Trop de tentatives. Réessayez dans ${s}s`,
        verifying: "Vérification…",
        cancel: "Annuler",
      },
      errorBoundary: {
        title: "Le système est momentanément hors ligne",
        subtitle: "Nous le restaurons. Il sera bientôt opérationnel — aucune action requise.",
        reload: "Recharger",
      },
    },
    questions: {
      1: "Faites-vous du sport ou de l'exercice régulièrement ?",
      2: "La musique vous accompagne-t-elle toujours, même à l'entraînement ?",
      3: "Cherchez-vous toujours à optimiser votre temps ?",
      4: "Consacrez-vous du temps chaque jour à prendre soin de vous ?",
      5: "Êtes-vous souvent en déplacement ou en voyage ?",
      6: "Aimez-vous les gadgets intelligents qui suivent santé et activité ?",
      7: "Le design et l'esthétique comptent-ils beaucoup pour vous ?",
      8: "La récupération physique et le sommeil de qualité sont-ils prioritaires ?",
    },
  },
};
