# Deploy e passagem da release 2.1.0

Branch `fix/security-and-release-hardening`. Há mudança de contrato SQL/Edge/frontend. Push ou build local não comprova publicação.

## Prévia visual

Push pode acionar a integração Git da Vercel. O escopo atual é portfólio: **Preview e Production usam demo por padrão**. Configurar explicitamente `VITE_DEMO_MODE=true`, `VITE_ALLOW_REAL_CUSTOMER_DATA=false` e `VITE_ENABLE_MARKETING=false` nos escopos de portfólio para eliminar ambiguidade. É catálogo/visitante sintético, sem coleta, credenciais de funcionários, escrita ou envio reais. Esse deploy de frontend não exige migrações ou ativação do Supabase. Autor: Costanzo Annichini; contato fictício visível: `suaipe@example.invalid`, não monitorado.

Usar apenas o URL **fornecido pela Vercel**. Após sucesso informado pelo provedor, consultar `/release.json`: versão `2.1.0`, commit esperado, `demo:true`. Conferir jornada e bloqueio dos formulários de funcionários/recuperação. Não inventar URL a partir do nome da branch.

## Staging e produção real

1. Confirmar projeto/ambiente e backups. Restaurar dados e arquivos reais em ambiente isolado; o teste sintético local não substitui essa prova. Registrar artefato vigente e plano de retorno.
2. Pausar quiosques e drenar entregas de webhook. Preservar configuração por nome; não copiar secrets para documentos.
3. Aplicar migrações ausentes em ordem: anteriores, duas de 06/11, `20261107000001_portfolio_and_marketing.sql`, `20261107000002_storage_limits.sql` e `20261107000003_subject_rights.sql`. Não reaplicar cegamente. Não expor schema `private` na API.
4. Publicar `verify-pin`, `on-session-created`, `relay-to-sheets`, `privacy-maintenance`. `supabase/config.toml` registra endpoints com autenticação interna (secret/PIN). Relay manual valida Auth/cargo/MFA. Verificar o gateway contra falsificação de prefixo de `X-Forwarded-For`: a cauda deve ser controlada pela infraestrutura.
5. Configurar secrets/origem da tabela abaixo. Secret do webhook deve coincidir com seu header. Confirmar sender, DNS e limites de Auth no ambiente real. Não permitir wildcard de origem.
6. Configurar rotina diária: GitHub variables `PRIVACY_MAINTENANCE_ENABLED=true`, `SUPABASE_PROJECT_URL=https://<ref>.supabase.co`; secret `MAINTENANCE_SECRET` igual ao da função. Schedules operam na branch padrão e o cron é UTC; antes do merge/staging, usar workflow_dispatch na branch ou scheduler autorizado equivalente.
7. Executar manutenção pela primeira vez e conferir. POST `/functions/v1/privacy-maintenance`, header `x-maintenance-secret`. **A chamada realmente apaga dados vencidos**; não tratá-la como simples health check. Conferir marcador/kiosk_ready e reconciliar pendências; não marcá-las concluídas só para deixar o job verde.
8. Somente após o checklist real: publicar frontend com `VITE_DEMO_MODE=false`, `VITE_ALLOW_REAL_CUSTOMER_DATA=true`, URL/chave pública e identidade/contato **reais e monitorados** de privacidade. Contatos reservados de exemplo são rejeitados em Production real. Confirmar aviso/finalidades/fornecedores com o responsável.
9. Conferir `/release.json` com commit e `demo:false`. Testar visitante sintético, papéis/MFA/lojas, desconto oficial, retries, prazo e resgate. Conferir aceite no provedor e inbox separadamente.
10. Atualizar PWAs e reabrir gradualmente. Verificar limpeza de cache REST e sessão administrativa ao voltar ao quiosque. Observar erros, quotas, e-mails ambíguos, exclusões externas e recebimento de alertas.

## Configuração por nome

| Local | Variáveis/secrets | Uso |
|---|---|---|
| Vercel portfólio Preview/Production | `VITE_DEMO_MODE=true`, `VITE_ALLOW_REAL_CUSTOMER_DATA=false`, `VITE_ENABLE_MARKETING=false` | Demo isolada; padrão de qualquer build |
| Vercel real | `VITE_DEMO_MODE=false`, `VITE_ALLOW_REAL_CUSTOMER_DATA=true`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Backend real; somente chave pública |
| Vercel real | `VITE_PRIVACY_CONTROLLER`, `VITE_PRIVACY_CONTACT` | Identidade e contato monitorado; exigidos na build de produção |
| Vercel opcional | `VITE_ENABLE_ERROR_MONITORING=true`, `VITE_SENTRY_DSN` | Erros minimizados; sem replay/tracing; ignorado na demo |
| Build opcional | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Upload/remoção de sourcemaps; nunca prefixo VITE |
| Edge runtime | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Configuração exclusivamente do serviço |
| Edge | `WEBHOOK_SECRET`, `BREVO_API_KEY`, `EMAIL_SENDER`, `SITE_URL` | Autenticação do webhook, envio e assets |
| Edge | `ALLOWED_ORIGIN`, `STAFF_PIN` | Origem real; PIN secreto ou hash de fallback **servidor** |
| Edge opcional | `ENABLE_SHEETS_RELAY=true`, `GOOGLE_SHEETS_WEBHOOK_URL` | Ativar CRM após revisão de finalidade/acesso/retenção |
| Edge opcional | `WHITELIST_EMAILS` | Bypass controlado para testes; não publicar endereços no bundle |
| Edge + scheduler | `MAINTENANCE_SECRET` | Secret longo/aleatório para o scheduler, pelo canal seguro |
| Futuro marketing | `VITE_ENABLE_MARKETING=true` + `app_config.marketing_enabled=true` | Somente após revisão do aviso, identidade do endereço e retirada/supressão externas; a aplicação não envia campanhas |

Para deploy por API de outra IA, credenciais de gerenciamento Vercel/Supabase devem estar nos secrets do ambiente, com destinos/projeto confirmados. Não são chaves públicas de frontend. Não colar tokens em chat ou versioná-los.

## Falha e retorno

Manter coleta pausada se a validação falhar. Preferir correção à frente; não reabrir INSERT/grants públicos, fallback de PIN ou ignorar MFA para destravar. Frontend antigo sozinho não é um rollback compatível. Ensaiar retorno coordenado em staging.

Conferir aceitação no provedor antes de qualquer novo envio ambíguo; preservar o código. Exclusão local exige reconciliação das cópias externas e retenções pertinentes. O código não comprova sozinho cumprimento jurídico, entrega inbox ou restauração de produção.

## Registro para outra IA depois do deploy

Anotar URL real, `/release.json`, commit, ambiente/projeto, migrações aplicadas, funções publicadas, nomes das configurações, resultados dos testes, scheduler/alertas e pendências. Não registrar tokens nem dados de clientes. [AI-HANDOFF.md](AI-HANDOFF.md) explica as regras atuais; a auditoria anterior preserva o histórico.

Saúde operacional: GET no mesmo endpoint/secret é somente leitura; não renova kiosk_ready. O workflow verifica uma vez por hora e aplica retenção uma vez por dia. No workflow_dispatch, a opção padrão health não apaga dados; escolher maintenance explicitamente para a primeira execução. Confirmar destinatários dos alertas e investigar pendências em vez de ignorá-las.

A checagem horária contém o consumo de runners; jobs agendados usam minutos de GitHub Actions. Conferir a franquia e alertas de custo do plano antes de habilitar. Nenhum orçamento/gratuidade é garantido pelo código.
