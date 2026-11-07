# Capturas atuais de portfólio

07/11/2026. As cinco imagens desta pasta foram capturadas no Chromium real a partir dos builds locais atuais; não são imagens geradas para simular uma interface inexistente. A [proveniência](provenance.json) registra engine, dimensões e escopo.

Attract/welcome/quiz/result usam o modo demo, visitante sintético e catálogo fictício. A captura Manager usa o frontend real com sessão, MFA/cargo e catálogo **totalmente simulados**, com requisições interceptadas localmente. Não comprova autorização no Supabase nem significa que a rota administrativa esteja aberta na demo pública.

Foram substituídas as imagens antigas que ainda mostravam identidade corporativa anterior, endereço de e-mail e métricas sem contexto de demonstração. As quatro cópias em `public/screenshots` também foram substituídas; o manifesto informa as dimensões reais 1366×1024. O histórico do Git não foi reescrito e ainda pode conter as imagens antigas. Confirmar direitos de mídia e de divulgação continua sendo responsabilidade do autor.

Reprodução: servir os builds demo e real de teste em `127.0.0.1:4182` e `:4181` e executar `node scripts/capture-portfolio.mjs`. O script só aceita servidores locais e bloqueia requisições externas; não recebe credenciais de produção. Essas capturas são documentação e não alteram os snapshots de referência dos testes WebKit.
