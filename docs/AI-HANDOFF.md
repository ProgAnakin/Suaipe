# Passagem técnica para outra IA — Suaipe 2.1.0

Preparado em 06/11/2026, Europe/Rome. Branch `fix/security-and-release-hardening`; versão **2.1.0 candidata**. Este documento explica o código, não certifica o ambiente hospedado.

## Contexto e leitura

`8acdb61` continha a primeira rodada de correções. `6651114` registrou a grande auditoria. A implementação posterior continua na branch de melhorias. Consulte o [resultado atual e pendências](releases/2.1.0/README.md), [deploy](DEPLOY-2.1.0.md), [runbook](runbook.md) e [auditoria histórica](audits/2026-11-06/README.md). Não confundir testes antigos com o resultado atual ou push com implantação.

## Demonstração e produção

- `VITE_DEMO_MODE=true` usa catálogo local e `Demo Visitor / demo@example.invalid`. Sem formulário de dados pessoais, eventos de funil, escrita, PIN, monitoramento ou e-mail reais. Rotas administrativas/recuperação não exibem campos de credenciais. O SDK da demo usa configuração fictícia e outro namespace de sessão.
- `VERCEL_ENV=preview` ativa demo por padrão. Uma variável explícita `VITE_DEMO_MODE` tem precedência. Não conectar uma demonstração pública aos clientes reais.
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
- CSVs e Sheets neutralizam fórmulas/caracteres de controle. Respeitar os filtros. Usar o helper compartilhado.
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
- Workflow diário `privacy-maintenance.yml` depende de flag, URL e secret configurados. Pendências fazem o job falhar para chamar atenção. Confirmar recebimento de alertas, não presumir.

## Migrações, validação e limites

Ordem: `20261103000001_release_security.sql` (anterior), `20261106000001_prelaunch_audit_fixes.sql`, `20261106000002_privacy_operations.sql`. Depois quatro funções, scheduler/manutenção e frontend real. Pausar quiosques; clientes antigos são incompatíveis. Roteiro: [DEPLOY-2.1.0.md](DEPLOY-2.1.0.md).

Checks: `npm run typecheck`, `npm run typecheck:edge`, `npm run lint`, `npm run test:coverage -- --maxWorkers=2`, `npm run test:db`, `npm run test:restore`, `npm run test:e2e`, `npm run test:e2e:demo`.

Edge typecheck usa declarações mínimas de Deno/tipos do SDK local; não substitui runtime hospedado. SQL usa Auth/Storage mínimos locais. Restore é sintético, sem dados/arquivos reais. CI inclui Gitleaks, cinco regras SAST, auditoria npm, tipos, SQL, restore, unidade/build e duas suítes WebKit. Regressões novas da auditoria estão na suíte normal. Não esconder falhas nem atualizar screenshots sem revisão.

Não declarar concluídos sem evidência: deploy/ACLs/gateway/Auth reais; WebKit/iPad; backup/arquivos reais e RTO/RPO; alertas/DNS/entrega; contratos, direitos de imagens/marcas/vídeos e material corporativo; aplicabilidade jurídica; capacidade/p95/soak. As medições sintéticas não são SLA e os 317 itens do protocolo não estão automaticamente aprovados. Configurar credenciais por canal seguro, nunca em chat.

O scheduler também faz GET de saúde uma vez por hora, sem apagar dados nem atualizar a permissão de coleta; pendências antigas/falhas de e-mail e manutenção vencida geram falha de monitoramento. POST é a operação diária que realmente aplica retenção. No workflow_dispatch, selecionar maintenance explicitamente para a primeira execução.
