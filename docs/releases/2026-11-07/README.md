# Continuação da auditoria — 07/11/2026

Versão 2.1.0 candidata, branch `fix/security-and-release-hardening`, a partir de `1507f01`. O commit que contém este relatório reúne as alterações e evidências. **O portfólio usa dados fictícios por padrão; operação com dados reais permanece NO-GO.** Deploy hospedado não confirmado.

## Escopo e alterações

Costanzo Annichini definiu o projeto como portfólio pessoal para público europeu (IT/PT/ES/FR). Sem contato real informado: `suaipe@example.invalid` é exemplo reservado e explicitamente fictício. Marketing é possibilidade futura condicionada à permissão do cliente e a procedimentos adicionais.

- **Coleta acidental:** qualquer build, inclusive Vercel Production, usa demo por padrão. Real exige `VITE_DEMO_MODE=false` e `VITE_ALLOW_REAL_CUSTOMER_DATA=true`; Production real rejeita contato de exemplo/ausente. Demo não pede credenciais, grava contatos ou envia mensagens, e informa isso durante todo o percurso.
- **Consentimento/direitos:** marketing separado, opcional, sem pré-seleção e desativado nos dois lados; versão/timestamp próprios, sem reutilizar contatos antigos. Gerente+MFA pode exportar sessões por endereço exato, corrigir nomes, registrar retirada e excluir. Correção/retirada são auditadas. Identidade, entrega segura e cópias externas exigem operador.
- **Integrações:** relay recebe só `session_id`, consulta registro canônico autorizado e exige opt-in não retirado. Destino e cada redirect limitados aos hosts do Apps Script/Google; sem rede interna ou repost de contatos após 303. Erros não retornam sucesso. Limites de corpo/leitura/chamada; cancelamento hostil não prende o leitor.
- **Arquivos/sessão:** assinatura raster, bytes/pixels limitados, conversão obrigatória sem enviar original inválido e limites do bucket. Logout apaga credenciais locais e esconde dados imediatamente offline. Stats revalida cargo/MFA e descarta respostas antigas; recuperação tem prazo, erro genérico e proteção contra duplicação.
- **Relatórios:** UTC consistente e agregação sem busca repetida. Todos os CSVs usam proteção compartilhada, incluindo histórico/modelo de preços. Importação trata aspas/BOM/vírgulas, IDs/preços/duplicatas/limites, preserva loja/preço atual e informa gravação parcial com linhas pendentes. Histórico identifica limite de 200 eventos e origem legacy não verificada; alterações genéricas não aparecem como desativação.
- **Mídia/portfólio:** cinco imagens antigas e quatro cópias públicas substituídas por capturas autênticas com fixtures, sem marca/endereço corporativos anteriores ou métricas sem contexto. Manager é uma fixture local, não prova de autorização hospedada. Manifesto e traduções estáticas corrigidos; snapshots WebKit preservados; histórico Git não reescrito.
- **Prevenção:** alertas moderados de desenvolvimento eliminados. Um advisory baixo de build sem correção publicada ficou com exceção exata, expiração e revisão humana pendente. CI recebe testes Deno/gate de dependências/registro; novo monitoramento semanal, preservando a configuração existente do Dependabot.

## Verificação local

| Verificação | Resultado | Limite |
|---|---|---|
| Instalação | `npm ci` passou | Não certifica autoria/proveniência de todos os componentes |
| Unidade | **234 testes / 35 arquivos**; cobertura final em `evidence.json` | Parcial; SQL/navegador são medições separadas |
| Tipos/lint | App/config e contrato Edge passaram; zero erros, quatro avisos existentes de Fast Refresh | SDK local não é gateway real |
| SQL | **81 verificações passaram** | PostgreSQL 17 com Auth/Storage mínimos |
| Concorrência | 12 claims → uma sessão; 12 reservas → uma; 35 pedidos distintos → 30 aceitos/cinco limitados; outra loja disponível | Não envia e-mail nem mede capacidade hospedada |
| Consulta/restore | 20 mil linhas com Index Scan; restore sintético preserva dados/funções/RLS | Sem SLA/p95, arquivos, backup real ou RTO/RPO |
| Deno nativo | **Três testes passaram**, Deno 2.9.6 | Fronteiras locais de handler; sem SDK/gateway/provedor real |
| Navegador | **16 funcionais + dois da demo passaram no Chromium** | Inclui marketing com/sem opt-in, importação administrativa parcial/retomada e demo sem Supabase; WebKit/iPad físico pendentes |
| WebKit | 21 cenários definidos no total, incluindo três snapshots do engine | Engine ausente/downloads bloqueados; baselines não alteradas |
| Builds/guards | Real sintético/demo passaram; Production padrão é demo. Chave privada, real sem habilitação e contato fictício recusados | Compilação não é deploy; configuração real de teste é sintética |
| Dependências | Produção **zero alertas**; completo **quatro baixos**, zero moderados/altos/críticos | Um advisory deepmerge propagado em quatro pacotes de build; exceção até 07/12/2026, revisão humana pendente |
| Inventário | **731 componentes** SBOM / **748 entradas instaladas** nos avisos | Escopos diferentes; sem certificação jurídica/de mídia |
| Scanners/HTTP | Resultados e escopos finais em [evidence.json](evidence.json) | Achados brutos não equivalem a vulnerabilidades confirmadas |

## Três arquivos e 317 controles

A [matriz completa](../../readiness/README.md) preserva 311 IDs e identifica os seis checkboxes sem código como COOKIE-01–06. O [JSON](../../readiness/controls.json) contém fonte/linha, hashes das três fontes, evidência, responsável e ação por item; os dois textos menores estão cruzados por seção. Estatísticas, referências e alegações jurídicas dos textos não foram assumidas como fatos verificados.

Classificação: **24 verificados localmente, 147 parciais, 112 pendentes externos e 34 não aplicáveis ao escopo atual**. Não é nota percentual de segurança. Pagamentos/LLM em produção não existem neste fluxo; IA de desenvolvimento continua no escopo.

`npm run readiness` valida o registro. `npm run readiness -- --real-data` deve bloquear: documentos e rascunhos não aprovam configurações, contratos, revisão humana ou operação.

## Pendências antes de dados reais

1. Acessos pelo canal seguro, projetos/ambientes confirmados e comparação do esquema hospedado. Runtime observado sem credenciais Vercel/Supabase ou backend pronto; requirements/domínios do rascunho não aplicados.
2. Revisão humana independente do código crítico/exceção, branch protection, execução remota da CI e alertas recebidos.
3. Contato monitorado, finalidades/bases/necessidade, retenção, contratos/regiões/transferências, direitos de mídia/marca/material corporativo e governança de IA. Portfólio pode gerar logs técnicos e não implica isenção jurídica automática.
4. Auth/recuperação/MFA/papéis/lojas/Storage/Realtime/gateway reais com contas próprias, WebKit/iPad, teclado/leitor/contraste, staging adversarial e carga/soak. Quotas não provam visitante humano ou titularidade do e-mail.
5. Restore de SQL **e arquivos reais** isolado, RTO/RPO, preservação de exclusões/supressões após restore, rollback coordenado, orçamento e alertas; sender/DNS, aceite e inbox verificados separadamente.
6. Antes de campanhas: propriedade do endereço/double opt-in quando adequado, retirada/supressão em fornecedores e cancelamento em cada mensagem. Campanhas/supressão externa automática **não estão implementadas**. CSV geral não é mailing autorizado.

Demo pode ser implantada sem ativar banco/Edge/coleta. Push pode solicitar Preview por integração Git; sem resultado do provedor não há URL nova comprovada. Operação futura segue [deploy coordenado](../../DEPLOY-2.1.0.md), incluindo três migrações de 07/11, quatro funções e scheduler. Não enfraquecer MFA/grants/PIN para destravar.

## Próxima IA

Ler [AI-HANDOFF.md](../../AI-HANDOFF.md), [escopo/riscos](../../readiness/scope-and-risks.md), [privacidade/direitos](../../readiness/privacy-operations.md), [incidentes/restore](../../readiness/incident-and-recovery.md) e [proveniência das imagens](../../screenshots/README.md). Usar evidências desta pasta; registrar URL real, commit, projeto, migrações/funções/configurações por nome, resultados hospedados e pendências, sem credenciais ou dados de clientes.
