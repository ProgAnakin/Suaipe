# Resultado das correções — Suaipe 2.1.0 candidata

> Registro da rodada de 06/11. Consulte a [continuação de 07/11](../2026-11-07/README.md) para o estado atual, novos testes e escopo de portfólio.

06/11/2026. Branch `fix/security-and-release-hardening`. Base auditada: `8acdb61`; auditoria histórica: `6651114`. O commit que contém este relatório reúne a implementação e estas evidências. **Validação local concluída dentro do escopo abaixo; implantação hospedada não confirmada.**

## O que mudou, em linguagem simples

- **Acesso:** o banco passou a exigir cargo, loja e segundo fator nos pontos identificados; o navegador não pode fabricar registros de auditoria nem contornar a verificação de PIN.
- **Falhas de conexão:** há prazo máximo, repetição segura e cancelamento ao reiniciar. O mesmo pedido conserva seu identificador e conteúdo para evitar duplicação ou troca silenciosa de destinatário.
- **Relatórios:** exportações percorrem as páginas, respeitam filtros e apresentam erros. CSV e Sheets neutralizam fórmulas; os totais deixam de depender da primeira página.
- **Privacidade:** aviso em cinco idiomas com versão registrada, integrações opcionais, fonte local, telemetria reduzida, rotina de retenção e fila para conferir exclusões nos fornecedores.
- **E-mail:** cupons vencidos não iniciam envio. A interface distingue o aceite pelo provedor da entrega efetiva na caixa de entrada.
- **Demonstração:** Preview usa dados fictícios e não solicita credenciais de funcionários nem grava/envia contatos reais.
- **Prevenção:** scanners de código/segredos na CI, dependências atualizadas, ações fixadas por commit, checagem operacional e documentação única para a próxima IA.

## Fechamento dos achados da auditoria

“Implementado” descreve o código e as regressões locais; não certifica configuração ou comportamento de produção.

| Achado | Correção/evidência | Situação restante |
|---|---|---|
| R01 — Storage sem MFA | Políticas restritivas de escrita de imagens; SQL nega aal1 e aceita perfil legítimo | Exercitar uploads reais em staging |
| R02 — fórmulas/nome inválido | Validação SQL e helpers CSV/Sheets; regressões com prefixos e controles | Conferir integração real de planilha |
| R03 — espera sem fim | Timeout, retry idempotente, abort/reset e invalidação de callbacks | Jornada WebKit/rede real pendente |
| R04 — endereço divergente | Destinatário bloqueado após tentativa; alteração exige reinício | Jornada de navegador pendente |
| R05 — fornecedores/aviso | Aviso versionado, Sheets opt-in, Sentry minimizado, retenção/exclusão | Identidade, finalidades, contratos e aplicabilidade jurídica dependem do operador |
| R06 — funil público/fabricado | Leitura cargo/MFA/loja; data, quotas e sequência no servidor; claimed vem da sessão | Validar políticas hospedadas; automação pública continua risco residual |
| R07 — guias sem cargo | RLS de guias/anexos exige cargo + MFA | Conferir cadastro/Auth e tokens reais |
| R08 — auditoria forjada | INSERT cliente revogado; triggers usam JWT e alteração real | Histórico legacy não ganhou autenticidade retroativa |
| R09 — PIN contornável | RPC só de serviço, contador persistente por origem e sem fallback público | Confirmar cauda confiável de X-Forwarded-For no gateway |
| R10 — bloqueio/consulta de login | RPCs públicos de auditoria/cooldown revogados; Auth nativo | Conferir quotas e configuração do Auth real |
| R11 — expiração/entrega | Expiração antes da reserva, ID do provedor e linguagem de aceite; saúde detecta pendências | Conferir inbox/bounce/alerta; reconciliar estados ambíguos |
| R12 — exportação incompleta | Paginação compartilhada, contagens/duplicatas, filtros, erro explícito e teto de 100 mil | Paginação não é snapshot transacional sob qualquer mutação |
| R13 — consulta/quota | Índice de e-mail normalizado/data; quotas por loja e limites de corpo | Falta tráfego-alvo, p95/soak e defesa completa contra bots |
| R14 — testes/CI | 192 testes, regressões SQL/concorrência/guards, SAST/segredos e duas suítes WebKit configuradas | WebKit/iPad não executados neste ambiente |
| R15 — direitos/licenças | SBOM atual, avisos de terceiros e separação da licença do projeto | Direitos de mídia/marca, material corporativo e termos exigem comprovação própria |
| R16 — recuperação/deploy | Restore sintético, health/scheduler, release.json e roteiro coordenado | Falta restore real/arquivos, RTO/RPO, alertas recebidos e prova do deploy |
| R17 — documentação antiga | AGENTS, CLAUDE, README, handoff, Edge e runbook atualizados | Registrar resultados e URLs reais após implantação |

## Evidência desta rodada

| Verificação | Resultado observado | Limite |
|---|---|---|
| Tipos | App/config e contrato Edge passaram | Edge não foi executado no Deno hospedado |
| ESLint | Zero erros; quatro avisos existentes de Fast Refresh | Avisos não foram ocultados |
| Unidade | **192 testes em 29 arquivos passaram** | Mocks/local, não navegador hospedado |
| Cobertura | **20,96% das linhas**, antes 9,44%; instruções 20,83%, ramificações 13,38%, funções 18,1% | Cobertura ainda parcial; exclui SQL/Edge/navegador |
| Banco | **60 assertions passaram** em PostgreSQL 17 descartável | Auth/Storage mínimos, não Supabase real |
| Concorrência | 12 claims → uma sessão; 12 reservas → uma; segunda sessão/endereço suprimida | Não envia e-mail real |
| Consulta sintética | 20 mil linhas; Index Scan, execução 0,103 ms nesta medição; auditoria anterior viu Seq Scan ~9,61 ms | Medição local/cache; não é SLA, p95 ou teste de carga |
| Restore | Dump/restore sintético preservou dados, funções e RLS; anônimo sem PII | Não cobre arquivos/backup de produção |
| Builds | Real e demo passaram; release.json correto, sem sourcemaps públicos; fonte local servida | Real usa backend/contato sintéticos para compilar |
| Guards de build | Chave privada e produção sem contato de privacidade foram rejeitadas | Não certifica configuração do provedor |
| HTTP local | Seis rotas por modo, JS, fonte, worker e avisos de terceiros servidos | Resposta da SPA não substitui jornada de navegador |
| npm audit produção | **Zero alertas em todas as severidades** | Retrato do feed em 06/11/2026 |
| npm audit completo | **12 moderados, dois baixos**, zero altos/críticos, restritos à cadeia de desenvolvimento | Continuam pendentes; não aplicar downgrade forçado para esconder alertas |
| Gitleaks 8.24.3 | Zero novos alertas no histórico e patch; seis fingerprints históricos revisados/ignorados pontualmente | Placeholders/chaves públicas anon; não cobre secrets de provedores/objetos apagados |
| Semgrep 1.184.0 da CI | Cinco regras, 154 arquivos, zero achados e erros de parser | Regras específicas; não significa revisão de todo tipo de falha |
| Semgrep amplo | 441 regras, 263 arquivos, 278 ocorrências e zero erros de parser | 246 i18n, 13 composição HTML, 12 props, cinco heurísticas de template, um placeholder e um aviso de props no debounce; não são 278 vulnerabilidades confirmadas |
| Inventário | SBOM npm: 739 componentes; avisos: 761 entradas instaladas do lockfile | Contagens têm escopos diferentes; sem certificação jurídica |
| Playwright | 16 cenários existentes + dois da demo descobertos | **Não executados**: WebKit ausente; downloads bloqueados pela política aplicada |

O HTML dos e-mails tem codificação contextual e tags de ênfase sem atributos permitidas no servidor. A triagem dos scanners não é garantia de ausência de XSS. As seis exclusões de segredos são fingerprints exatos em `.gitleaksignore`; não há supressão genérica de chaves.

## Publicação e pendências concretas

O objetivo é enviar a branch de melhorias; uma integração Git configurada pode solicitar a prévia na Vercel. **Não há URL nova, status da Vercel ou migração hospedada comprovados nesta execução.** Não tratar o endereço histórico do README como a nova versão.

Faltam credenciais/configuração de gerenciamento e runtime. Foi salvo um rascunho com requisitos seguros e destinos de API, sem valores. Revisar/salvar nas configurações e publicar o ambiente ativa as mudanças; salvar rascunho não ativa rede nem cria tokens. Não colar credenciais em chat.

Para liberar dados reais: confirmar backup e restore real; aplicar migrações e quatro funções em manutenção; configurar aviso/fornecedores, scheduler e alertas; testar papéis/MFA/lojas/gateway, e-mail, iPad/WebKit e limites; conferir o commit em `/release.json`. Exclusões em Supabase não apagam automaticamente Brevo, Sheets, CSVs ou backups. A primeira manutenção POST apaga registros vencidos; GET é saúde somente leitura.

Não há aprovação automática dos 317 itens dos textos, selo LGPD/GDPR, prova de capacidade ou alegação de segurança total.

## Próxima IA

1. Ler [AI-HANDOFF.md](../../AI-HANDOFF.md) para contratos e invariantes.
2. Seguir [DEPLOY-2.1.0.md](../../DEPLOY-2.1.0.md), sem reintroduzir grants públicos, fallback de PIN ou contornar MFA.
3. Usar [evidence.json](evidence.json), [SBOM](sbom.cdx.json), [audit de produção](npm-audit-production.json) e [audit completo](npm-audit-full.json) como retratos desta execução. A [auditoria anterior](../../audits/2026-11-06/README.md) é histórica.
4. Registrar URL fornecida pelo provedor, commit, projeto/ambiente, migrações/funções, nomes de configurações, resultados hospedados e pendências; jamais secrets ou dados de clientes.
