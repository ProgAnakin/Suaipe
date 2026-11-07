# Passagem técnica para outra IA — Suaipe 2.1.0

Preparado em 06/11/2026, atualizado em 07/11/2026, Europe/Rome. Branch `fix/security-and-release-hardening`; versão **2.1.0 candidata**. Este documento explica o código, não certifica o ambiente hospedado.

Escopo confirmado pelo autor em 07/11: portfólio pessoal de Costanzo Annichini, público europeu (IT/PT/ES/FR); marketing é possibilidade futura condicionada à autorização. Sem contato real fornecido. Usar `suaipe@example.invalid` como exemplo reservado e explicitamente fictício. Ler a [rodada atual](releases/2026-11-07/README.md) e a [matriz individual dos 317 controles](readiness/README.md); a rodada de 06/11 é histórica.

## Contexto e leitura

`8acdb61` continha a primeira rodada de correções. `6651114` registrou a grande auditoria. A implementação posterior continua na branch de melhorias. Consulte o [resultado atual e pendências](releases/2.1.0/README.md), [deploy](DEPLOY-2.1.0.md), [runbook](runbook.md) e [auditoria histórica](audits/2026-11-06/README.md). Não confundir testes antigos com o resultado atual ou push com implantação.

## Demonstração e produção

- `VITE_DEMO_MODE=true` usa catálogo local e `Demo Visitor / demo@example.invalid`. Sem formulário de dados pessoais, eventos de funil, escrita, PIN, monitoramento ou e-mail reais. Rotas administrativas/recuperação não exibem campos de credenciais. O SDK da demo usa configuração fictícia e outro namespace de sessão.
- **Qualquer build**, inclusive Production da Vercel, usa demo por padrão. Operação real exige explicitamente `VITE_DEMO_MODE=false` e `VITE_ALLOW_REAL_CUSTOMER_DATA=true`. A segunda variável evita ativação acidental por configuração antiga. Não conectar portfólio público aos clientes reais.
- Produção real usa Supabase e exige identidade/contato reais de privacidade na build. O modo real depende de manutenção diária; não é liberado por uma prévia visual.
- `/release.json` informa versão, commit fornecido pela Vercel e modo demo. Comparar com o commit esperado. `commit="local"` não prova deploy.

## Quiosque e sessão

Orquestrador: `src/pages/Index.tsx`, attract → welcome → quiz → result → success. Matching continua por tags, desempate aleatório e percentuais 45–98; não é um LLM em produção.

Ao entrar no quiosque, a sessão administrativa local é encerrada e marcadores antigos contendo e-mails são removidos. Um funcionário não deve deixar autenticação disponível ao próximo visitante. O catálogo vem de `custom_products`, configurações da loja, visibilidade e cartões ativos; fixtures não são fallback para coletar contatos com configuração inválida.

`kiosk_ready(store)` confirma manutenção nas últimas 48 horas. Sem isso, a UI não coleta dados e o servidor recusa novas sessões. O cache de catálogo não substitui a confirmação. Troca de loja limpa a sessão e cancela respostas antigas.

RPC pública: `submit_quiz_session(p_request_id uuid,p_payload jsonb)`. Corpo: nome, sobrenome, email, respostas booleanas (até oito), produto, match 0–100, loja, idioma, timestamp de consentimento, `consent_notice_version="2026-11-06"` e UUID de funil. Valores comerciais/estado de processamento são derivados do banco. A implementação anterior foi movida a `private`, sem acesso do cliente.

- Um UUID/corpo **imutáveis** entre tentativas; fingerprint rejeita conteúdo diferente sob o mesmo ID.
- Endereço bloqueado após a primeira tentativa. Para mudar, reiniciar o fluxo; nunca mostrar um endereço e enviar para outro.
- Até três tentativas, oito segundos cada e backoff; SDK também tem prazo geral. Timeout pode ocorrer depois de commit: repetir com o mesmo ID.
- Reinício, troca de loja e desmontagem abortam transporte e invalidam callbacks. Inatividade continua ativa durante solicitação.
- Cinco sessões/endereço/hora; quotas por loja: 30/minuto e 600/hora. Não são prova de visitante humano nem proteção completa contra bots.

## Autorização, PIN e auditoria

- `/manager` exige sessão, aal2 e cargo gerente/responsável. RLS/RPCs continuam sendo a autoridade, inclusive loja.
- Imagens exigem gerente + MFA para escrita; guias/anexos exigem cargo de funcionário + MFA.
- Triggers registram alterações reais de configuração com identidade do JWT. INSERT de auditoria pelo cliente foi revogado. `source=legacy` não ganhou autenticidade retroativa.
- PIN: somente Edge `verify-pin` → `verify_staff_pin_server` (serviço). O antigo RPC público foi removido. Limitação persistente/serializada por origem: cinco falhas em dois minutos; `client_id` não controla o contador. IP em hash continua sendo dado pseudonimizado.
- **Premissa externa:** gateway precisa sobrescrever/anexar `X-Forwarded-For` de forma confiável; usa-se a cauda, recusando ausência. Não hospedar diretamente aceitando headers do visitante. Validar isso no serviço real.
- Login usa Auth nativo; navegador não fabrica tentativas globais nem consulta atividade de um endereço via cooldown.

## Funil, relatórios e exportação

- `record_quiz_event` permite início/resultado com data do servidor, sequência e quotas (120/minuto, 2.400/hora por loja). `claimed` vem do commit da sessão.
- Leitura de funil exige cargo, MFA e loja. Filtro de interface não é isolamento.
- Paginação usa quantidade recebida, ordem estável, limite de 100 mil e conferência de duplicatas/contagem. Erro não gera “sucesso” parcial. Diminuir datas quando necessário. A paginação HTTP não equivale a uma transação de snapshot para exportações formais sob qualquer mutação concorrente.
- CSVs e Sheets neutralizam fórmulas/caracteres de controle. Respeitar os filtros. Usar o helper compartilhado, inclusive no histórico/modelo de preços. O importador aceita template protegido/aspas/vírgulas, valida IDs/duplicatas, preserva a loja e deixa falhas pendentes; não é um lote atômico. Conferir a linha ambígua antes de repetir. Histórico exporta os 200 eventos carregados/filtrados e identifica legacy como não verificado.
- Nomes de produtos preferem o snapshot da sessão, não apenas fixtures.

## E-mail e fornecedores

`on-session-created` exige secret, lê dados canônicos, reserva envio atomicamente e conserva o código. Cupom expirado não reserva envio. Expiração de 24 horas e resgate por cargo/loja/MFA permanecem no servidor.

`email_sent=true` / estado `sent` = **aceite do provedor**, não inbox. `email_provider_id` permite conferir entrega/bounce. Estados: `pending`, `sending`, `sent`, `failed`, `uncertain`, `suppressed`; só pending/failed reservam novamente. Não resetar estados ambíguos em massa nem prometer exactly-once entre sistemas.

Templates aceitam somente tags de ênfase sem atributos, validadas no servidor. Campos pessoais/produto/URLs têm escaping contextual. Requisições possuem limites de tamanho e leitura; chamadas externas possuem timeout. SDKs Edge usam versão explícita.

Sheets é opt-in por `ENABLE_SHEETS_RELAY=true`, com cópia minimizada e fórmulas neutralizadas. Relay manual exige gerente + MFA e reporta falhas; não é outbox durável de CRM. Sentry é opt-in de erros minimizados, sem replay/tracing/sessões automáticas; demo não inicializa. Fonte hospedada localmente elimina Google Fonts.

## Privacidade operacional

- Aviso traduzido/versionado; identidade e contato do controlador configuráveis. A build não emite parecer de conformidade.
- `run_privacy_maintenance` (somente serviço): sessões/funil 30 dias, acessos/login 14 dias, cooldown legado um dia, auditoria 730 dias; tarefas concluídas são minimizadas e depois removidas. Atualiza disponibilidade do quiosque.
- Exclusão local enfileira Brevo/Sheets em `external_erasure_requests`, inclusive por cautela quando uma integração não foi utilizada. Gerente confirma conclusão ou não aplicabilidade após verificar; email é removido da tarefa concluída e a ação é auditada.
- Management → Privacy permite solicitações verificadas de exclusão local e conferência de tarefas externas. Exclusão local não significa exclusão do provedor/logs/backups/CSV.
- A mesma aba exporta somente as sessões do endereço exato verificado (`get_customer_records`, com paginação), aplica correção validada de nomes (`correct_customer_names`) e registra retirada de marketing. Todos exigem gerente+MFA; mudanças de nomes/retirada são auditadas. Não existe consulta pública por e-mail. Verificação de identidade, entrega segura e fornecedores continuam tarefas do operador.
- Workflow diário `privacy-maintenance.yml` depende de flag, URL e secret configurados. Pendências fazem o job falhar para chamar atenção. Confirmar recebimento de alertas, não presumir.

## Migrações, validação e limites

Ordem: migrações anteriores, duas de 06/11 e `20261107000001_portfolio_and_marketing.sql`, `20261107000002_storage_limits.sql`, `20261107000003_subject_rights.sql`. Depois quatro funções, scheduler/manutenção e frontend **real**. Pausar quiosques; clientes antigos são incompatíveis. Para o portfólio sintético, publicar apenas o frontend em demo não exige ativar serviços de clientes. Roteiro: [DEPLOY-2.1.0.md](DEPLOY-2.1.0.md).

Checks: `npm run typecheck`, `npm run typecheck:edge`, `npm run lint`, `npm run test:coverage -- --maxWorkers=2`, `npm run test:db`, `npm run test:restore`, `npm run test:e2e`, `npm run test:e2e:demo`.

Edge typecheck usa declarações mínimas de Deno/tipos do SDK local; não substitui runtime hospedado. SQL usa Auth/Storage mínimos locais. Restore é sintético, sem dados/arquivos reais. CI inclui Gitleaks, cinco regras SAST, auditoria npm, tipos, SQL, restore, unidade/build e duas suítes WebKit. Regressões novas da auditoria estão na suíte normal. Não esconder falhas nem atualizar screenshots sem revisão.

Agora há `npm run test:edge:runtime`: três testes de fronteira executados no Deno oficial 2.9.6, sem SDK/gateway/provedores reais. Chromium local executa jornadas por `PLAYWRIGHT_BROWSER=chromium npm run test:e2e` e `test:e2e:demo`; ignora somente os três snapshots visuais exclusivos de WebKit e desativa vídeo por falta do FFmpeg do Playwright. Isso não é aprovação de WebKit/iPad físico. Capturas de documentação são geradas pelo navegador com fixtures locais; não são baselines de teste nem prova de autorização hospedada.

## Marketing, dependências e operação futura

`VITE_ENABLE_MARKETING=false` e `app_config.marketing_enabled=false` por padrão. A escolha opcional é separada do resultado, sem pré-seleção, com booleano/versão própria e timestamp do servidor. Cadastros antigos permanecem sem opt-in. `marketing_withdrawn_at` impede elegibilidade no relay; preservar evidência inicial. Campanhas, double opt-in e supressão externa não estão implementados. Antes de qualquer campanha, rever titularidade do endereço, finalidade, prazo, contratos e cancelamento real. Um CSV geral não é uma lista autorizada para marketing.

Relay automático exige opt-in não retirado. Relay manual recebe somente `{session_id}` e consulta registro canônico com autorização; não aceita nome/e-mail fabricados no corpo. Destino e redirects limitam-se a `script.google.com` / `script.googleusercontent.com`; requests têm prazo e método de redirect corretos. Respostas recusadas não reportam sucesso.

Imagens: assinatura/MIME, até 5 MB, dimensões/pixels limitados e re-encode obrigatório; erro não retorna o original. Bucket limita tamanho/MIME e continua público só para catálogo. Isso não substitui inspeção antimalware servidor contra upload direto de gerente.

`npm run audit:dependencies` confere a árvore completa com exceção exata e temporária para o advisory baixo de deepmerge na ferramenta PWA; não há exceção de produção. Vence em 07/12/2026 e requer revisão humana. O cron semanal foi adicionado e a configuração existente do Dependabot foi preservada; confirmar execução/notificações na branch padrão. `npm run readiness` valida a integridade do registro; `-- --real-data` deve falhar enquanto a liberação real estiver bloqueada.

Ler [escopo/riscos](readiness/scope-and-risks.md), [registro de tratamento/direitos](readiness/privacy-operations.md) e [incidentes/recuperação](readiness/incident-and-recovery.md). Não tratar a elaboração desses documentos como assinatura de contrato, revisão humana independente ou prova de alertas/restore reais.

Não declarar concluídos sem evidência: deploy/ACLs/gateway/Auth reais; WebKit/iPad; backup/arquivos reais e RTO/RPO; alertas/DNS/entrega; contratos, direitos de imagens/marcas/vídeos e material corporativo; aplicabilidade jurídica; capacidade/p95/soak. As medições sintéticas não são SLA e os 317 itens do protocolo não estão automaticamente aprovados. Configurar credenciais por canal seguro, nunca em chat.

O scheduler também faz GET de saúde uma vez por hora, sem apagar dados nem atualizar a permissão de coleta; pendências antigas/falhas de e-mail e manutenção vencida geram falha de monitoramento. POST é a operação diária que realmente aplica retenção. No workflow_dispatch, selecionar maintenance explicitamente para a primeira execução.
