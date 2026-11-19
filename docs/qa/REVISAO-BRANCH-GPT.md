# Revisão da branch `fix/security-and-release-hardening` (GPT)

Documento de trabalho — em português, porque é uma revisão para o autor do projeto. Resultado de ler o código e a documentação da branch
do GPT, conferir **cada achado contra esta branch** (`claude/youthful-babbage-W9gm1`) e portar o que era válido.
Data: 19/11/2026. Base comum das duas branches: `main` @ `53105bd`.

## 1. Resumo

- A branch do GPT tem **4 commits, 186 arquivos, ~150 mil linhas** (a maior parte é evidência de auditoria: SBOM, listas de
  licenças, JSON de scanners). Esta branch tem mais de 70 commits sobre a mesma base. **As duas divergiram**: não dá para mesclar uma na outra
  sem decidir, ponto a ponto, qual contrato de gravação vale (ver §5).
- A auditoria do GPT (R01–R17, `docs/audits/2026-11-06/README.md` na branch dele) foi feita sobre **`main` + o primeiro commit dele** (`8acdb61`),
  não sobre esta branch. Dos 17 achados: **8 já estavam resolvidos aqui** (3 deles foram completados agora), **4 foram resolvidos nesta rodada**,
  **2 estão mitigados** (dependem de ligar uma chave / acrescentar scanners) e **3 continuam abertos** (reserva atômica do e-mail; licenças e direitos;
  ensaio de restauração — os dois últimos não são código). Nenhum foi descartado como falso.
- O que ele acertou (nas auditorias ou no código) e vale muito: **o e-mail corrigido durante a tentativa de claim**, **o formulário de boas-vindas abandonado
  expondo nome e e-mail**, **upload de imagem que "cai" para o arquivo original**, **sessão de equipe esquecida no quiosque**, **chaves
  privadas no navegador**, **backdating do funil**, **bloqueio de login por terceiros**, **privacidade vs. Sheets/Sentry**, **fixar as Actions
  do CI por commit**. Tudo isso está implementado e testado aqui (§4).
- O que ele propõe e **não** foi portado (de propósito): trocar a gravação por uma RPC com `REVOKE INSERT`, o "dead-man switch" de 48 h
  (`kiosk_ready`), o build em modo demo por padrão, upgrades de plataforma em bloco (Node 24 / Vite 6 / Vitest 5 / Router 7), o registro de
  317 controles. São decisões de arquitetura/operação com risco real para 4 lojas em produção — explicadas no §5, com a forma segura de adotá-las depois.
- O maior item funcional que **resta** é a **reserva atômica do e-mail** (R11/R13): hoje, dois disparos simultâneos do webhook para a mesma
  sessão podem mandar dois e-mails com códigos diferentes (um deles com um código que o banco já não guarda). Desenho pronto no §6, ainda não implementado.

## 2. Como foi feito (e o que não foi)

- Li com `git show origin/fix/security-and-release-hardening:<arquivo>` as migrações SQL, as Edge Functions, o front, o CI, os scripts e os documentos
  de auditoria e de entrega (deixei de fora os JSON/CSV de evidência: SBOM, licenças, saída de scanners). Conferi cada achado R01–R17 **no código desta branch**; onde a dúvida era comportamento, reproduzi
  num banco PostgreSQL descartável (ex.: inserir um evento de funil datado de 40 dias atrás como `anon`; gravar cinco falhas de login de outro e-mail).
- **Não executei a branch do GPT** (nem a suíte SQL dele, nem o Playwright dele): o relatório dele mesmo diz que o Playwright foi
  "descoberto (16 testes) e não executado — WebKit ausente" e que a cobertura unitária da época era 9,44 % das linhas. Portanto o que eu aceito
  dele é **a ideia, conferida contra o meu código e provada por teste novo aqui** — não "o que ele diz que passou".
- Nada foi publicado: **as Edge Functions não foram tocadas** (nada a `supabase functions deploy`), e as 3 migrações novas precisam ser
  aplicadas à mão (§7). Não fiz push em nenhuma outra branch e não abri PR.

## 3. Mapa dos 17 achados

Legenda: **Antes** = já resolvido nesta branch antes desta rodada · **Agora** = resolvido nesta rodada · **Mitigado** · **Aberto**.

| ID | Achado (resumo) | Situação | Evidência / o que fazer |
|---|---|---|---|
| R01 | Gerente só com senha envia mídia ao Storage (sem MFA) | **Mitigado** | A chave `app_config.require_mfa` (migração `20261011000003`) exige `aal2` também em `storage.objects`; **vem DESLIGADA**. Ação: cadastrar o TOTP de toda a equipe e ligar (`docs/server-hardening.md` §A, `docs/deployment.md` passo 8). |
| R02 | Nome `=1+1` vira fórmula no CSV | **Antes** | `csvCell`/`toCsv` (cobrem `= + - @ \| %`, com espaços iniciais) e `sheetsSafe` na Edge; teste e2e "the CSV export … no cell can run as a formula". Validar o nome no servidor não foi adotado: a camada certa é a **saída**, e recusar prefixos no banco barraria nomes legítimos. |
| R03 | Claim que fica pendurado; reset por inatividade desligado durante `claiming` | **Antes** | Cada tentativa é abandonada em 12 s, 3 tentativas com recuo; o reset por inatividade segue ligado; cenários de queda/travamento em `kiosk-resilience`. |
| R04 | Depois de uma tentativa, o e-mail pode ser alterado mas o corpo da requisição segue o primeiro endereço | **Agora** | Era um bug real **nesta** branch: o `id` do claim é por visita e `23505` conta como sucesso, então o segundo claim (e-mail corrigido) era dado como gravado com o endereço errado. `claimIdentityFor`: mesmo endereço ⇒ mesmo id; outro endereço ⇒ id novo. 6 testes. |
| R05 | Aviso de privacidade cita Supabase/Brevo, mas o Sheets copia nome/e-mail e o Sentry roda sem escolha | **Agora** | Aviso nos 5 idiomas nomeia o Google Sheets (a menos que `VITE_PRIVACY_SHEETS=false`) e o Sentry (quando há DSN). Sentry passa a **só erros**, sem replay/tracing/usuário e com URLs e e-mails removidos (`sentryScrub`). **Revisão jurídica do texto continua necessária.** |
| R06 | Funil: leitura sem papel/loja e eventos forjáveis com data passada | **Antes + Agora** | Leitura por papel/loja já resolvida (`20261011000002`). Backdating **reproduzido e fechado agora** (gatilho com o relógio do banco). **Aberto:** um visitante ainda pode *acrescentar* eventos de hoje (inclusive `claimed`) — desenho no §6. |
| R07 | Conta sem cargo lê as guias internas | **Agora** | As políticas liam `USING (true)`; agora exigem uma linha em `store_roles`. Cadastro público já é documentado como desligado (`docs/deployment.md`). |
| R08 | Conta sem cargo grava no histórico com identidade de gerente | **Antes** | Checks existentes no `security.sql`: "cannot write an entry in somebody else's name", "role-less user cannot write at all". |
| R09 | PIN: erro `42702` no bloqueio e contorno trocando o identificador | **Antes** | Reescrito em `20261011000001` (endereço = o que o gateway viu; limite global; sobrecargas antigas removidas) + testes. **Fraqueza que resta:** o contador da Edge Function é em memória (por isolate) — §6. |
| R10 | Qualquer um forja falhas de login e bloqueia a interface de outra pessoa; consulta atividade de e-mail | **Agora** | **Reproduzido** aqui (5 chamadas ⇒ `locked: true` por 5 min, repetível). Tentativas agora contadas por (e-mail, origem) com hash curto do endereço; quem ataca só bloqueia a si mesmo e não enxerga as tentativas dos outros. 9 checks novos. |
| R11 | Cupom vencido reservado por webhook atrasado; "aceito pelo provedor" ≠ "entregue" | **Aberto** | Depende da reserva atômica + estados do e-mail (§6). |
| R12 | Exportação "0 sessões com sucesso" em erro; totais sem paginação | **Antes + Agora** | Paginação (`fetchAllPages`) e erros explícitos já existiam. Agora também **sem linha repetida** quando um lead entra no meio da leitura (chave por `id`). |
| R13 | Limite por e-mail varre a tabela; só limita por endereço | **Antes** | Índice `quiz_sessions_email_norm_created_idx` (`20261011000001`), 5 leads/h por endereço no gatilho e um teto global por minuto (testado com 150 inserções). Quota por quiosque/origem: não adotada. |
| R14 | Lacunas de CI e de testes de jornada | **Mitigado** | Já há: typecheck, lint, audit, vitest, build, Playwright (smoke obrigatório + resiliência em WebKit), job SQL com ataques. **Faltam** varredura de segredos e SAST (§6). Nesta rodada: token do workflow só-leitura e Actions fixadas por commit. |
| R15 | Licenças, atribuições, direitos de uso | **Aberto** | SBOM/lista de licenças do GPT (`licenses.csv`, `sbom.cdx.json`) pode ser regenerada a cada release (`@cyclonedx/cyclonedx-npm`); a parte de direitos (imagens, marcas, vídeo, termos das ferramentas de IA) é decisão **sua/jurídica**. |
| R16 | Sem prova de restauração, alertas, quotas, rollback | **Aberto (operação)** | Não é código. Fazer **um** ensaio de restauração (RTO/RPO anotados), configurar alertas no Supabase/Vercel e anotar o procedimento de rollback no `docs/runbook.md`. As migrações desta branch são **aditivas**: voltar só o front-end é seguro. |
| R17 | `CLAUDE.md` e runbook descrevem contratos antigos | **Antes + Agora** | Reescritos na rodada anterior; atualizados de novo nesta (inatividade no formulário, sessão de equipe, imagens, contagens de teste). |

## 4. O que entrou nesta rodada (10 commits de código + documentação)

| Commit | Mudança | Prova |
|---|---|---|
| `fix(kiosk)` claim + inatividade | Identidade do claim presa ao e-mail normalizado; **formulário de boas-vindas passa a ser vigiado** (janela de 90 s + contagem de 10 s e volta ao início com os campos vazios). | 6 testes unitários + 1 e2e que **falha sem a mudança** (verificado por mutação). O e2e encurta os dois temporizadores em vez de usar o relógio falso do Playwright: com ele a contagem trava no último quadro ("1 s") e a tela nunca volta ao início. |
| `feat(security)` chave pública | O build (e o app) recusam chave `service_role`, `sb_secret_…` ou `sbp_…` em `VITE_SUPABASE_PUBLISHABLE_KEY`. | 10 testes; build com chave de serviço **falha** (exit 1), com o stub dos testes passa. |
| `fix(manager)` imagens | Upload **falha fechado**: tipo, tamanho (5 MB), cabeçalho real (PNG/GIF/JPEG/WebP), bomba de descompressão (64 MP), 15 s de decodificação; nunca sobe o original. Migração `20261119000001` dá ao bucket os mesmos limites no servidor. | 20 testes + 3 checks SQL. |
| `fix(kiosk)` sessão de equipe (2 commits) | Abrir o quiosque encerra qualquer sessão de equipe do navegador (escopo `local`). **Detalhe que só apareceu ao testar:** o `supabase-js` devolve o erro e **mantém a sessão** quando o pedido de logout não chega ao servidor (wifi, conexão derrubada) — justamente o caso de um quiosque; por isso o navegador esquece a sessão sozinho nesse caso. | 6 unitários + 3 e2e (um derruba a conexão do logout e confere o armazenamento vazio). |
| `fix(db)` guias/esquema | Guias exigem papel; `REVOKE CREATE ON SCHEMA public`. Migração `20261119000002`. | 7 checks SQL. |
| `fix(stats)` paginação | Linha repetida quando um lead entra durante a leitura. | 2 testes que reproduzem o deslocamento. |
| `ci` | `permissions: contents: read`; 4 Actions fixadas no commit (conferido contra as tags upstream). | YAML válido; Dependabot (github-actions) mantém os pins. |
| `fix(db)` funil/login | Funil com relógio do banco; tentativas de login por origem. Migração `20261119000003`. | 9 checks SQL; **o runner do SQL agora falha quando uma instrução quebra** (antes um check com erro simplesmente sumia da contagem). |
| `fix(privacy)` | Sentry só erros e sem dados; aviso de privacidade nomeia Sheets e Sentry. | 11 + 10 testes. |

## 5. O que o GPT faz diferente e **não** foi portado

| Proposta dele | Por que não agora | Como adotar com segurança (se quiser) |
|---|---|---|
| **Claim por RPC** `submit_quiz_session` + `REVOKE INSERT` em `quiz_sessions` | Troca o contrato de gravação. Um quiosque que segue com o bundle antigo (o PWA só troca de versão ao recarregar/navegar, o que num quiosque ligado pode levar dias) **para de gravar leads** assim que a migração roda; o próprio relatório dele (R16) diz: "A migração muda o contrato: reverter apenas o frontend pode quebrar a gravação". Aqui o mesmo objetivo (o navegador só grava o que é permitido) é cumprido por políticas + gatilho, com 103 verificações de ataque/permissão no banco (`supabase/tests/security.sql`). | Duas fases: (1) criar a RPC mantendo o INSERT; (2) publicar o front e **esperar todos os quiosques atualizarem** (um `release.json` ajuda a conferir); (3) só então `REVOKE INSERT`. |
| **`kiosk_ready`** (`20261106000002`) — a função só devolve "pronto" se a rotina `privacy-maintenance` rodou nas últimas **48 h** (`app_config.maintenance_last_run`); sem isso `submit_quiz_session` levanta `Kiosk unavailable` e o front (`Index.tsx`) também recusa | Acopla a coleta de leads a uma rotina de operação: se o agendador falha, a função cai ou alguém esquece, **todos os quiosques param de vender em 2 dias**. É um risco de indisponibilidade criado por segurança (e a rotina exige um agendador que o projeto hoje não tem). | Preferir **alerta** quando o sinal faltar (e-mail/Slack), não corte automático. Se um dia houver retenção automática (§6, item 2), o alerta de "rotina atrasada" já resolve o que o corte pretendia. |
| **Build em modo demo por padrão** (`VITE_ALLOW_REAL_CUSTOMER_DATA`) | Inverte o padrão de uma loja em produção: um deploy sem a variável vira demo silencioso e **não grava lead nenhum**. Faz sentido para o seu vídeo/demonstração no LinkedIn, não como padrão de produção. | Opcional: `VITE_DEMO=true` só no build público de demonstração. |
| **MFA no banco ligado de imediato** | Quem ainda não cadastrou o TOTP perde o acesso na hora da migração. Aqui a chave existe e vem desligada. | Cadastrar a equipe ⇒ ligar a chave (um `UPDATE`). |
| **Upgrades em bloco** (Node `^24`, Vite 6, Vitest 5, React Router 7) | Muda toda a plataforma de uma vez, com `engines` que exigem Node 24 (confirme que o Vercel e os runners aceitam) — e no relatório de 06/11 o Playwright dele não foi executado. Mexe em CI, Vercel e testes ao mesmo tempo. | Um PR por vez. Para o Router 7 especificamente: `npm audit --omit=dev` aponta 2 avisos moderados no `react-router-dom` (redirecionamento aberto via `\` em `<Link>`/`navigate` e injeção no hydrate de SSR); **nas chamadas que conferi o app só navega para caminhos fixos, e não usa SSR**, então o risco prático é baixo — ainda assim, subir para `7.18.6` num PR próprio, com os e2e. |
| **Registro de 317 controles** (`docs/readiness`) | Útil como checklist de referência, mas é manutenção pesada (vários controles não se aplicam: pagamentos, agentes de LLM) e fácil de virar "documento que afirma o que ninguém verificou". | Usar como lista de consulta; manter só o que for verificável por teste/CI. |
| **Operações de privacidade** (retenção automática, direitos do titular, consentimento de marketing) | São **decisões de produto/jurídicas**, não correções: qual retenção, se haverá marketing. | Ver §6 (retenção e pedido de titular). |

## 6. Backlog priorizado (o que falta, em ordem)

**P1 — antes de aumentar o volume**
1. **Reserva atômica do e-mail** (R11/R13). Hoje a Edge Function verifica `email_sent` e depois chama a Brevo; dois disparos simultâneos passam
   ambos. Desenho: coluna `email_status` (`NULL`/`sending`/`sent`/`failed`) + `email_attempt_at` + `email_provider_id`; RPC **só para `service_role`**
   `begin_session_email(id)` que, numa transação com bloqueio por linha e por endereço, devolve "pode enviar" a **um** chamador (ou reentrega após
   5 min parado em `sending`); o 1/hora por endereço passa a ser decidido ali; a função grava `sent`/`failed`. Recusar sessão vencida antes de enviar.
   Teste: o harness `vitest + ts.transpileModule + new Function` do GPT executa a Edge Function sem Deno; o runner SQL prova a concorrência (12 chamadas ⇒ 1 reserva).
   Risco: tocar uma função de 985 linhas que só é testada ao ser implantada ⇒ implantar numa loja primeiro.
2. **Retenção automática** (decisão sua): quantos meses guardar leads. Depois, agendar `purge_sessions_older_than` (pg_cron) e citar o prazo no aviso.
3. **Pedido de titular** (acesso/apagar por e-mail): um procedimento documentado (consulta + `DELETE`) já basta; RPC só se houver volume.

**P2**
4. **Contador do PIN persistente** (R09): hoje a Edge Function conta em memória; cold start zera. Desenho do GPT: RPC `verify_staff_pin_server(..., p_secret_valid)`
   **só para `service_role`** (`REVOKE … FROM PUBLIC, anon, authenticated`), IP com hash. **Nunca** acrescentar um parâmetro "segredo válido" à RPC pública (seria um bypass de autenticação).
5. **Funil: `claimed` derivado do lead** e teto por loja (R06). Gatilho em `quiz_sessions` que registra o `claimed`; a política deixa de aceitar `claimed` do cliente.
   Mexe no e2e do funil (o mock não tem gatilhos).
6. **Segredos no CI**: `gitleaks` (o GPT achou 6 alertas no histórico — 4 placeholders e 2 JWTs `anon`, nenhum `service_role`) com `.gitleaksignore` revisado. Semgrep: baixo sinal (221 das 250 ocorrências dele eram avisos de i18n).
7. **Ensaio de restauração + alertas** (R16).
8. **`release.json`** + cabeçalhos `no-store` no `vercel.json`: permite conferir qual versão cada quiosque está rodando (pré-requisito da migração para RPC do §5).

**P3**
9. SBOM/licenças a cada release (R15).
10. **Fonte `Space Grotesk` servida localmente** (`@fontsource-variable/space-grotesk`): hoje o CSS importa do Google Fonts — o IP do visitante vai ao Google
    (risco de privacidade na UE) e o quiosque offline depende de a fonte já estar em cache. **Não foi feito nesta rodada** porque muda os pixels das 3 imagens-base do teste visual
    (WebKit, geradas no CI) e não tenho WebKit aqui para regenerá-las: fazer num PR próprio, rodando antes o workflow *Update Visual Baselines*, e tirar `fonts.googleapis.com`/`fonts.gstatic.com` do CSP.

## 7. Aplicar em produção (nesta ordem)

1. **Migrações, à mão** (`supabase db push` ou SQL editor), em ordem de nome:
   `20261119000001_storage_bucket_limits.sql` (bucket `product-images`: 5 MiB, JPEG/PNG/WebP) →
   `20261119000002_guides_need_a_staff_role.sql` → `20261119000003_funnel_time_and_login_lock_per_caller.sql`.
   Todas idempotentes e aditivas; o front-end antigo continua funcionando com elas.
2. **Front-end**: sobe sozinho ao fazer merge em `main`. Variáveis novas (todas opcionais): `VITE_PRIVACY_SHEETS` (deixe vazio enquanto usar o Sheets),
   `VITE_SENTRY_REPLAY`. **Mudança de comportamento:** Sentry deixa de enviar replay e tracing.
3. **Edge Functions**: nada a implantar.
4. Quando a equipe toda tiver TOTP: ligar `app_config.require_mfa`.
5. Pedir ao seu advogado/DPO que reveja o novo trecho do aviso (Sheets/Sentry).

## 8. Números desta rodada

| Porta | Resultado |
|---|---|
| `typecheck` · `lint` | limpo (lint: 0 erros, 4 avisos conhecidos de `react-refresh`) |
| `npm test` | **268** testes unitários em 30 arquivos (eram 208 em 26) |
| `npm run build` | passa — e **falha** com uma chave de serviço no lugar da chave pública (verificado) |
| `npm run test:sql` | 61 migrações aplicadas do zero; **103** verificações de ataque/permissão + **63** de MFA; a suíte roda de novo com `require_mfa` ligado (103 ✓). Eram 84 + 63 |
| `npm audit --omit=dev` | 0 altos/críticos; 2 moderados (`react-router`, ver §5) |
| Playwright (Chromium, viewport de iPad) | **86** testes — resultado final no §9 |
| WebKit (o motor do iPad) | **não executado aqui** (só há Chromium nesta máquina): o CI é quem confirma — ver §9 |

## 9. Resultado das execuções do navegador

Chromium com viewport de iPad (nesta máquina não há WebKit: ele só roda no CI).

- **Primeira corrida completa (85 testes): 82 passaram, 3 falharam.** Duas das falhas eram **minhas**: a limpeza da sessão de equipe, ao abrir o
  quiosque, fazia um logout que o `goto("/manager")` do teste abortava; o `console.error` do auth-js reprovava a checagem "nenhum erro na página".
  Isso mostrou um defeito real (o `supabase-js` **mantém a sessão** quando o logout não chega ao servidor) e levou a dois ajustes: a limpeza passou a esquecer a sessão
  localmente nesse caso, e os testes das áreas de equipe abrem a página direto. A terceira (`reload` na tela de resultado) foi `ERR_CONNECTION_REFUSED`
  — o servidor de pré-visualização indisponível naquele instante — e passou na repetição.
- **Repetição dos 15 testes afetados** (áreas de equipe, sessões e reinícios): 15/15 passaram.
- **Corrida completa final (86 testes, build com todas as mudanças): 86 passaram, 0 falharam (10 min).**
- **CI (WebKit, o motor do iPad), no mesmo código:** os 3 jobs obrigatórios (lint + testes + build, SQL do zero, Playwright E2E) e os 5 de resiliência
  (admin-areas, kiosk-resilience 1/2 e 2/2, kiosk-chaos, kiosk-layout) passaram no commit `2636c24`. Uma execução anterior do mesmo código teve o `Playwright E2E`
  **cancelado** no passo *Install Playwright browsers* (o limite de 15 min estourou na instalação do navegador — falha de infraestrutura, nenhum teste chegou a rodar);
  a execução seguinte passou.

## 10. O que fazer com a branch do GPT

- **Não mesclar** `fix/security-and-release-hardening` em `main` nem nesta branch: as duas redefinem os mesmos objetos de formas incompatíveis
  (a gravação do lead — INSERT direto com id do cliente aqui, RPC `submit_quiz_session` com `REVOKE INSERT` lá —, as políticas de MFA, o funil,
  o PIN), e a dele muda o contrato de gravação de uma loja em produção.
- **Mantê-la no remoto como referência** (não apagar): ela é a fonte do que está no backlog do §6 — o desenho de `begin_session_email`,
  a RPC de PIN só para `service_role`, o harness que executa a Edge Function sem Deno (`supabase/tests/edge-runtime.test.ts`), as operações de privacidade.
  Se for arquivá-la, marque com uma tag (ex.: `archive/gpt-hardening-2026-11`) antes de qualquer limpeza.
- **O que já saiu dela e está aqui** está no §4, com teste. O que falta, no §6, em ordem.
