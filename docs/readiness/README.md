# Matriz dos 317 controles

07/11/2026. Portfólio sintético atual; operação futura com dados reais permanece **NO-GO**.

311 IDs originais foram preservados; COOKIE-01 a COOKIE-06 identificam os seis checkboxes sem código. Os outros dois arquivos enviados têm o mapeamento por seção no [registro estruturado](controls.json), que inclui hashes das três fontes, evidências por item, responsável e próxima ação.

Verificado localmente comprova somente um artefato/teste local; parcial combina implementação com validação restante; pendente externo exige painel, pessoa, fornecedor ou avaliação própria; não aplicável é restrito ao escopo atual. Nenhum estado significa certificação de segurança ou conformidade. As alegações estatísticas/legais dos textos não foram tomadas como fatos verificados.

| Estado | Controles |
|---|---|
| verificado_localmente | 24 |
| parcial | 147 |
| pendente_externo | 112 |
| nao_aplicavel_ao_escopo | 34 |

Contexto: [escopo/riscos](scope-and-risks.md), [privacidade](privacy-operations.md), [incidentes/recuperação](incident-and-recovery.md), [dependências](dependency-review.md).

## GOV

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| GOV-01 | Definir a finalidade do produto, público-alvo, países de operação e modelo de negócio. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| GOV-02 | Identificar quem é o responsável técnico, jurídico e operacional. | parcial | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-03 | Identificar todos os ambientes: desenvolvimento, testes, staging e produção. | parcial | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-04 | Inventariar repositórios, branches, forks e versões publicadas. | parcial | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-05 | Mapear todos os domínios, subdomínios, APIs, serviços e endpoints. | parcial | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-06 | Inventariar fornecedores de infraestrutura, autenticação, banco de dados, pagamentos, mensagens, IA, analytics e armazenamento. | parcial | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-07 | Descobrir serviços criados durante experimentos que continuam ativos. | pendente_externo | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-08 | Identificar endpoints de depuração, contas de demonstração e funcionalidades incompletas. | parcial | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-09 | Registrar todas as dependências externas e os responsáveis por mantê-las. | parcial | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-10 | Definir quem autoriza a entrada de novas dependências e alterações arquiteturais. | parcial | Conferir inventário hospedado e confirmar responsáveis, finalidade e decisões do titular dos painéis. |
| GOV-11 | Identificar as funcionalidades críticas para receita, integridade e privacidade. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| GOV-12 | Criar uma lista dos riscos cuja materialização tornaria o negócio inviável. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
## THR

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| THR-01 | Criar diagramas de fluxo de dados (DFD). | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| THR-02 | Identificar fronteiras de confiança entre navegador, backend, banco e serviços externos. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| THR-03 | Mapear possíveis atacantes: visitantes anônimos, clientes maliciosos, insiders e terceiros comprometidos. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| THR-04 | Definir os ativos mais valiosos: dados, credenciais, saldos, arquivos, propriedade intelectual e disponibilidade. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| THR-05 | Simular o comprometimento de uma conta de cliente. | parcial | Executar o cenário também no ambiente segregado real, com contenção e responsável; revisar o risco residual. |
| THR-06 | Simular o comprometimento de um administrador. | parcial | Executar o cenário também no ambiente segregado real, com contenção e responsável; revisar o risco residual. |
| THR-07 | Simular o comprometimento de uma API externa. | parcial | Executar o cenário também no ambiente segregado real, com contenção e responsável; revisar o risco residual. |
| THR-08 | Simular o vazamento de uma chave de serviço. | parcial | Executar o cenário também no ambiente segregado real, com contenção e responsável; revisar o risco residual. |
| THR-09 | Verificar os impactos da exclusão acidental de dados por IA ou operador humano. | parcial | Executar o cenário também no ambiente segregado real, com contenção e responsável; revisar o risco residual. |
| THR-10 | Definir controles preventivos, detectivos e de recuperação para cada ameaça. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
## AI-DEV

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| AI-DEV-01 | Documentar quais ferramentas e modelos produziram ou modificaram cada componente crítico. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-02 | Impedir que agentes tenham acesso irrestrito às credenciais de produção. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-03 | Isolar os agentes em contêineres ou ambientes com permissões reduzidas. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-04 | Desativar aprovação automática de comandos destrutivos e operações sensíveis. | parcial | O ambiente usa auto_review imposto pela plataforma; não foi desativado. Revisar política de execução/produção conforme autorização do titular. Nenhuma afirmação de aprovação manual universal. |
| AI-DEV-05 | Revisar permissões de servidores MCP, plugins e ferramentas externas. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-06 | Inspecionar arquivos de instruções como AGENTS.md, CLAUDE.md e configurações equivalentes. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| AI-DEV-07 | Verificar se prompts enviados a serviços externos incluem informações pessoais ou segredos. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-08 | Auditar mudanças de código que não faziam parte do pedido original ao agente. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-09 | Inspecionar alterações em workflows, Dockerfiles, scripts de instalação e deployment. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-10 | Confirmar que a IA não apagou testes para fazer o pipeline passar. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| AI-DEV-11 | Identificar verificações falsas ou incompletas, como retornos constantes de sucesso. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-12 | Verificar que todas as bibliotecas sugeridas realmente existem e são confiáveis. | parcial | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-13 | Exigir revisão humana para autenticação, autorização, pagamentos e criptografia. | pendente_externo | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-14 | Executar revisão independente, preferencialmente por profissional que não participou da geração inicial. | pendente_externo | Revisão humana independente de código crítico e permissões reais de agentes/painéis; não equivale a autoavaliação da IA. |
| AI-DEV-15 | Garantir que a equipe consiga compreender, reproduzir e corrigir o sistema sem depender exclusivamente do agente que o gerou. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
## SUP

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| SUP-01 | Gerar um SBOM (Software Bill of Materials). | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| SUP-02 | Auditar bibliotecas diretas e transitivas. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-03 | Procurar CVEs conhecidos e versões vulneráveis. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-04 | Examinar pacotes suspeitos, pouco conhecidos ou recém-publicados. | pendente_externo | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-05 | Verificar typosquatting e dependências potencialmente inventadas pela IA. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-06 | Fixar versões e preservar arquivos lock. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| SUP-07 | Examinar scripts postinstall, preinstall e outros executados automaticamente. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-08 | Auditar licenças open source e exigências de atribuição. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-09 | Verificar integridade e origem dos artefatos. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-10 | Restringir a execução de pipelines provenientes de contribuições externas não confiáveis. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-11 | Configurar monitoramento contínuo de vulnerabilidades. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
| SUP-12 | Criar um processo para substituir componentes abandonados ou comprometidos. | parcial | Rever proveniência/termos com o mantenedor e confirmar monitoramento/PRs no GitHub; resolver ou rever exceção antes de expirar. |
## SEC

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| SEC-01 | Procurar segredos no repositório e em seu histórico. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| SEC-02 | Procurar chaves no JavaScript e em outros artefatos distribuídos ao navegador. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| SEC-03 | Procurar tokens em logs, mensagens de erro, comentários, arquivos de configuração e artefatos de CI. | parcial | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-04 | Identificar credenciais compartilhadas entre desenvolvimento e produção. | pendente_externo | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-05 | Rotacionar imediatamente credenciais efetivamente expostas. | pendente_externo | Nenhuma chave privilegiada efetivamente vazada foi confirmada nos scans. Não rotacionar chaves públicas anon só pelo alerta. Inventariar credenciais dos painéis e rotacionar/revogar caso exposição real seja constatada. |
| SEC-06 | Mover segredos para um gerenciador apropriado. | pendente_externo | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-07 | Separar identidades e credenciais de cada ambiente. | pendente_externo | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-08 | Exigir MFA resistente a phishing quando disponível para acesso administrativo. | pendente_externo | Staff usa TOTP no código. TOTP não é MFA resistente a phishing. Conferir suporte e habilitar proteção adequada em GitHub/Vercel/Supabase e identidades administrativas. |
| SEC-09 | Aplicar privilégio mínimo a contas de serviço. | pendente_externo | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-10 | Remover chaves antigas, acessos temporários e contas abandonadas. | pendente_externo | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-11 | Preferir credenciais de curta duração e identidades federadas quando suportadas. | pendente_externo | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-12 | Bloquear operações administrativas por usuários comuns. | parcial | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-13 | Monitorar mudanças de permissões e acessos privilegiados. | parcial | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-14 | Verificar se senhas, tokens e certificados podem ser revogados. | pendente_externo | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
| SEC-15 | Estabelecer um procedimento de emergência para comprometimento de credenciais. | parcial | Inventariar e testar secrets/identidades/revogação nos provedores sem copiar valores; não presumir que a configuração local prova produção. |
## AUTH

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| AUTH-01 | Validar cadastro, login, logout e recuperação de senha. | parcial | Login, recuperação e logout têm regressões locais; cadastro público de staff deve permanecer desabilitado. Completar o ciclo real, links expirados, MFA e mudança de dispositivo. |
| AUTH-02 | Verificar confirmação de e-mail ou outros mecanismos necessários para a identidade. | pendente_externo | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-03 | Implementar limitação de tentativas de login e proteção contra abuso. | parcial | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-04 | Impedir enumeração desnecessária de contas. | parcial | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-05 | Verificar armazenamento seguro de senhas por algoritmos próprios para hashing de credenciais. | pendente_externo | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-06 | Verificar cookies Secure, HttpOnly e SameSite, conforme arquitetura. | nao_aplicavel_ao_escopo | SPA usa tokens Bearer no SDK e sessionStorage, sem cookie de sessão da aplicação. Reavaliar se houver BFF/cookies. |
| AUTH-07 | Testar expiração e invalidação de sessões. | parcial | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-08 | Testar invalidação de sessões após troca de senha e eventos de risco. | pendente_externo | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-09 | Validar tokens OAuth/OIDC, incluindo assinatura, emissor, público e expiração. | pendente_externo | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-10 | Proteger alteração de e-mail, telefone, senha e MFA contra sequestro de conta. | pendente_externo | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-11 | Revalidar identidade antes de ações especialmente sensíveis. | parcial | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
| AUTH-12 | Verificar que tokens expirados, revogados ou manipulados não são aceitos. | parcial | Testar Auth hospedado com contas próprias, MFA, expiração/revogação/recuperação e configurações nativas de abuso. |
## ACL

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| ACL-01 | Criar uma matriz de papéis e permissões. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-02 | Aplicar negação por padrão. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-03 | Validar autorização no servidor ou em mecanismo equivalente confiável. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-04 | Testar todos os endpoints com sessão anônima. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-05 | Testar cada endpoint com usuário comum. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-06 | Testar operações administrativas com usuário sem privilégios. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-07 | Verificar acesso de usuário A a registros de usuário B. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-08 | Verificar acesso cruzado entre empresas ou organizações. | parcial | A unidade de isolamento implementada é loja, não tenant SaaS. Testar lojas A/B reais; não apresentar este modelo como isolamento genérico entre empresas. |
| ACL-09 | Testar alteração de IDs nos parâmetros, URLs e corpos das requisições. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-10 | Testar tentativas de alterar campos como role, owner_id e tenant_id. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-11 | Garantir que filtros de listagem respeitam o escopo do cliente. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-12 | Testar autorização de downloads, exportações, busca e relatórios. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-13 | Testar autorização em WebSockets e canais em tempo real. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-14 | Garantir que tarefas em segundo plano também preservam o isolamento. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
| ACL-15 | Impedir que usuários atribuam a si mesmos papéis superiores. | parcial | Repetir a matriz de perfis/MFA/lojas contra PostgREST/Storage/Realtime hospedados, incluindo mutações e IDs cruzados. |
## DB

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| DB-01 | Revisar os esquemas, tabelas, views, funções e procedimentos. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-02 | Habilitar políticas RLS quando a arquitetura utilizar esse mecanismo. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-03 | Verificar tanto as políticas RLS quanto as permissões SQL dos papéis. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-04 | Testar RLS individualmente para leitura, inserção, alteração e exclusão. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-05 | Verificar se contas administrativas e funções privilegiadas contornam as políticas. | parcial | Service role contorna RLS por desenho; browser não recebe esse segredo. Revisar grants/service accounts reais e excluir schema private da exposição da API. |
| DB-06 | Restringir conexões e interfaces administrativas à menor superfície necessária. | pendente_externo | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-07 | Revisar views privilegiadas e funções SECURITY DEFINER. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-08 | Verificar constraints, integridade referencial e unicidade. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-09 | Validar transações de operações financeiras ou críticas. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-10 | Evitar consultas com entrada de usuário concatenada diretamente. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-11 | Proteger backups e snapshots com controles equivalentes aos dados originais. | pendente_externo | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-12 | Revisar buckets de storage e assinaturas de eventos em tempo real. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-13 | Detectar divergências entre migrações e esquema real de produção. | pendente_externo | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-14 | Verificar permissões de leitura de dados excluídos logicamente. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
| DB-15 | Testar falhas parciais, rollback de transações e concorrência. | parcial | Comparar esquema/grants hospedados com migrações e executar regressões em staging; validar bypass de serviço, interfaces e backups reais. |
## API

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| API-01 | Documentar endpoints, métodos, parâmetros e autenticação. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-02 | Aplicar validação estrutural e semântica no servidor. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| API-03 | Testar SQL injection. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-04 | Testar NoSQL injection quando pertinente. | nao_aplicavel_ao_escopo | Persistência PostgreSQL; sem banco/consulta NoSQL no runtime. |
| API-05 | Testar command injection. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-06 | Testar SSRF nos recursos que acessam URLs fornecidas pelo usuário. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-07 | Testar mass assignment. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-08 | Aplicar limites de tamanho e profundidade a requisições. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| API-09 | Configurar rate limiting, quotas e proteção contra abuso. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-10 | Proteger endpoints contra replay quando necessário. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| API-11 | Aplicar idempotência em cobranças e operações repetíveis. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| API-12 | Validar assinatura e autenticidade de webhooks. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-13 | Tratar erros sem revelar segredos ou informações internas. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-14 | Verificar CORS e exposição indevida entre origens. | parcial | Executar os contratos/adversariais em staging com limites e credenciais reais; preservar quotas, canonização e idempotência. |
| API-15 | Testar regras de negócio contra manipulação de preço, desconto, saldo, quantidade e propriedade. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
## WEB

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| WEB-01 | Testar XSS refletido, armazenado e baseado no DOM. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-02 | Aplicar codificação contextual de saída e sanitização onde necessária. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-03 | Definir uma Content Security Policy adequada e testar seus efeitos. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-04 | Configurar HSTS, proteção de framing, política de referenciadores e outras headers pertinentes. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-05 | Verificar CSRF nas operações baseadas em cookies e suscetíveis ao problema. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-06 | Impedir exposição de tokens e informações sensíveis em URLs. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-07 | Avaliar uso de localStorage e sessionStorage para informações sensíveis. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-08 | Inspecionar artefatos de build e source maps expostos. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-09 | Auditar scripts de analytics, chat, publicidade e outros terceiros. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
| WEB-10 | Testar manipulação da interface e envio de requisições sem passar pelos formulários. | parcial | Conferir headers efetivos, CSP, URLs/tokens e comportamento de navegador no deploy real; WebKit/revisão visual pendentes. |
## FILE

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| FILE-01 | Limitar extensões, tipos e tamanhos aceitos. | parcial | Validar Storage real, MIME/tamanho e bypass direto com contas próprias; re-encode no cliente não é inspeção antimalware do servidor. |
| FILE-02 | Validar conteúdo real, não apenas extensão ou Content-Type. | parcial | Assinatura, decode, limite de pixels e re-encode são locais. Limites de bucket são do servidor, mas MIME declarado não equivale a inspeção dos bytes contra um upload direto de gerente. Validar tratamento de mídia no serviço real. |
| FILE-03 | Criar nomes seguros e impedir path traversal. | parcial | Validar Storage real, MIME/tamanho e bypass direto com contas próprias; re-encode no cliente não é inspeção antimalware do servidor. |
| FILE-04 | Isolar arquivos suspeitos e aplicar análise antimalware proporcional ao risco. | parcial | Sem upload de documentos de visitantes neste escopo. Catálogo raster é escrito por gerente+MFA. Avaliar antimalware/quarentena se ampliar tipos, público ou conteúdo privado. |
| FILE-05 | Evitar execução de conteúdo enviado pelo usuário. | parcial | Validar Storage real, MIME/tamanho e bypass direto com contas próprias; re-encode no cliente não é inspeção antimalware do servidor. |
| FILE-06 | Proteger arquivos privados com autorização verificável. | parcial | Validar Storage real, MIME/tamanho e bypass direto com contas próprias; re-encode no cliente não é inspeção antimalware do servidor. |
| FILE-07 | Aplicar expiração e escopo a URLs temporárias de acesso. | nao_aplicavel_ao_escopo | Não há emissão de URL assinada temporária neste código; reavaliar se introduzir arquivos privados. |
| FILE-08 | Testar arquivos malformados e bombas de descompressão. | parcial | Validar Storage real, MIME/tamanho e bypass direto com contas próprias; re-encode no cliente não é inspeção antimalware do servidor. |
| FILE-09 | Minimizar metadados sensíveis em imagens e documentos. | parcial | Validar Storage real, MIME/tamanho e bypass direto com contas próprias; re-encode no cliente não é inspeção antimalware do servidor. |
| FILE-10 | Garantir exclusão e retenção coerentes em storage, backups e versões. | parcial | Sessões têm retenção, imagens do catálogo têm ciclo próprio. Definir inventário e limpeza de arquivos órfãos/versões/backups; não apagar mídia em massa por dedução do nome. |
## LLM

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| LLM-01 | Modelar prompt injection direto e indireto. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-02 | Tratar documentos, páginas, e-mails e resultados de ferramentas como conteúdo não confiável. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-03 | Impedir que instruções em documentos alterem permissões do agente. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-04 | Executar ações com a identidade e os privilégios apropriados ao usuário. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-05 | Limitar ferramentas disponíveis a cada agente. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-06 | Exigir confirmação humana para pagamentos, exclusões e ações irreversíveis. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-07 | Restringir acesso a sistemas internos, rede, arquivos e serviços externos. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-08 | Separar dados e memórias de clientes diferentes. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-09 | Testar vazamento de documentos entre usuários em sistemas RAG. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-10 | Validar e tratar saídas antes de usá-las em SQL, comandos, navegadores ou outras ferramentas. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-11 | Testar falsificação de respostas e instruções presentes em resultados de ferramentas. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-12 | Definir limites de tokens, chamadas, duração e custo. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-13 | Testar falhas e indisponibilidade do provedor de modelo. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-14 | Aplicar avaliações de qualidade, alucinação e decisões incorretas. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-15 | Criar auditoria de ações automatizadas sem armazenar desnecessariamente conteúdo privado. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-16 | Testar agentes adversariais e tentativas de uso indevido das ferramentas. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-17 | Verificar políticas de retenção, uso para treinamento e subprocessadores do provedor. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
| LLM-18 | Implementar mecanismos de contenção e desligamento de agentes problemáticos. | nao_aplicavel_ao_escopo | Sem LLM/RAG/agente no produto em execução; IA de desenvolvimento é avaliada em AI-DEV. |
## QA-SEC

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| QA-SEC-01 | O pipeline executa testes em cada pull request relevante. | parcial | Confirmar execução remota e branch protection/revisões; não alterar baselines para esconder falhas nem chamar builds distintos de mesmo artefato. |
| QA-SEC-02 | Os scanners de código e dependências têm regras de bloqueio configuradas. | parcial | Confirmar execução remota e branch protection/revisões; não alterar baselines para esconder falhas nem chamar builds distintos de mesmo artefato. |
| QA-SEC-03 | Há detecção de novos segredos antes do merge. | parcial | Confirmar execução remota e branch protection/revisões; não alterar baselines para esconder falhas nem chamar builds distintos de mesmo artefato. |
| QA-SEC-04 | Alterações em arquivos de CI/CD exigem revisão reforçada. | parcial | Confirmar execução remota e branch protection/revisões; não alterar baselines para esconder falhas nem chamar builds distintos de mesmo artefato. |
| QA-SEC-05 | Testes críticos não podem ser removidos sem aprovação. | parcial | Confirmar execução remota e branch protection/revisões; não alterar baselines para esconder falhas nem chamar builds distintos de mesmo artefato. |
| QA-SEC-06 | Os relatórios ficam vinculados ao commit e ao artefato final. | parcial | Confirmar execução remota e branch protection/revisões; não alterar baselines para esconder falhas nem chamar builds distintos de mesmo artefato. |
| QA-SEC-07 | Exceções de segurança possuem justificativa, responsável e expiração. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| QA-SEC-08 | O build utilizado nos testes corresponde ao build que será publicado. | parcial | Metadados release.json identificam modo/commit. Builds locais de teste não são o artefato hospedado. Conferir o build/commit real do provedor e testar aquele artefato. |
## CR

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| CR-01 | Fluxos completos de autenticação e autorização. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-02 | Consultas com dados de múltiplos usuários. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-03 | Funções administrativas e elevadas. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-04 | Processamento de pagamentos, saldos e créditos. | nao_aplicavel_ao_escopo | Sem pagamento/saldo/crédito financeiro no produto. |
| CR-05 | Rotinas de exclusão, exportação e alteração de dados. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-06 | Tratamento de erros e compensação de transações. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-07 | Eventos assíncronos, filas, retries e webhooks. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-08 | Uso de credenciais privilegiadas. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-09 | Políticas de segurança implementadas fora do frontend. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-10 | Dependências entre módulos e efeitos colaterais inesperados. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-11 | Código provisório, duplicado, morto ou de demonstração. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
| CR-12 | Veracidade dos testes automatizados. | pendente_externo | Revisão humana independente pendente. Ler os fluxos indicados, registrar revisor, commit, resultados e correções. Não atribuir aprovação humana à IA. |
## PRIV

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| PRIV-01 | Listar todos os dados pessoais coletados. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-02 | Identificar dados sensíveis, financeiros, comportamentais e de crianças. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-03 | Associar cada dado a uma finalidade específica. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-04 | Determinar a base legal apropriada para cada tratamento. | parcial | Consentimento para resultado e opção separada de marketing são registros técnicos, não decisão jurídica definitiva. Confirmar base de cada finalidade e regras de marketing eletrônico nos países de operação. |
| PRIV-05 | Justificar a necessidade da coleta. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-06 | Identificar quem é controlador, operador/processador e suboperador. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-07 | Mapear transferências a terceiros e países estrangeiros. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-08 | Documentar onde os dados são armazenados e processados. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-09 | Definir períodos de conservação por categoria. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-10 | Implementar exclusão ou anonimização quando apropriado. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-11 | Criar mecanismos para acesso, correção e demais direitos dos titulares. | parcial | Exportação exata das sessões, correção de nomes, exclusão e retirada locais existem sob gerente+MFA. Comprovar identidade, entrega segura, prazos e cópias externas; alteração de e-mail exige exclusão/recoleta coordenada. |
| PRIV-12 | Definir como direitos são atendidos quando há múltiplos fornecedores. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-13 | Verificar retenção e exclusão em logs, filas, caches, backups e integrações. | parcial | Fila externa no mesmo banco não protege contra restauração antiga do banco. Conservar/reaplicar exclusões e supressões independentemente antes de reabrir após desastre. |
| PRIV-14 | Identificar tratamentos que exigem avaliação de impacto. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
| PRIV-15 | Documentar riscos residuais aos titulares. | parcial | Revisar finalidade/base/necessidade e processo de direitos com o responsável; comprovar fornecedores, logs, backups e atendimento real. |
## EU

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| EU-01 | Determinar se o GDPR se aplica à operação. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-02 | Identificar controlador e processadores. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-03 | Preparar avisos de privacidade claros e completos. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-04 | Celebrar contratos adequados com processadores conforme o artigo 28. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-05 | Manter registros de tratamento quando exigidos. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-06 | Aplicar privacy by design e by default. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-07 | Avaliar necessidade de DPIA, conforme artigo 35. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-08 | Verificar necessidade de DPO/encarregado formal. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-09 | Definir processo para atender direitos dos titulares. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-10 | Avaliar transferências internacionais e mecanismos de proteção. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-11 | Aplicar cláusulas contratuais padrão e avaliações complementares quando necessárias. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-12 | Definir regras de retenção, eliminação e portabilidade. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-13 | Documentar incidentes envolvendo dados pessoais. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-14 | Preparar comunicação à autoridade e aos titulares quando legalmente exigida. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
| EU-15 | Examinar normas nacionais italianas complementares. | pendente_externo | Determinar aplicabilidade e requisitos europeus/nacionais com responsável competente; comprovar contratos, regiões, transferências e procedimentos, sem inferir conformidade pelo código. |
## COOKIE

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| COOKIE-01 | Nenhum rastreador sujeito a consentimento dispara antes da escolha válida. | parcial | Inventariar rastreadores realmente publicados e base por finalidade; demo desliga Sentry, mas não certifica terceiros/logs da hospedagem. |
| COOKIE-02 | O usuário consegue rejeitar ou configurar categorias de rastreamento. | parcial | Inventariar rastreadores realmente publicados e base por finalidade; demo desliga Sentry, mas não certifica terceiros/logs da hospedagem. |
| COOKIE-03 | A decisão é registrada quando necessário para comprovação. | parcial | Inventariar rastreadores realmente publicados e base por finalidade; demo desliga Sentry, mas não certifica terceiros/logs da hospedagem. |
| COOKIE-04 | É possível retirar o consentimento sem dificuldades indevidas. | parcial | Inventariar rastreadores realmente publicados e base por finalidade; demo desliga Sentry, mas não certifica terceiros/logs da hospedagem. |
| COOKIE-05 | A política de cookies corresponde aos rastreadores efetivamente implantados. | parcial | Inventariar rastreadores realmente publicados e base por finalidade; demo desliga Sentry, mas não certifica terceiros/logs da hospedagem. |
| COOKIE-06 | Novas integrações não introduzem cookies não documentados. | parcial | Inventariar rastreadores realmente publicados e base por finalidade; demo desliga Sentry, mas não certifica terceiros/logs da hospedagem. |
## BR

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| BR-01 | Determinar se a LGPD se aplica. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-02 | Registrar finalidades e bases legais de tratamento. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-03 | Nomear responsáveis pela governança de dados. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-04 | Avaliar necessidade e forma de designação do encarregado. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-05 | Elaborar aviso de privacidade adequado ao público. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-06 | Definir controles de segurança técnicos e administrativos. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-07 | Verificar contratos e instruções de tratamento com operadores. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-08 | Estabelecer processo de atendimento a titulares. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-09 | Criar inventário de dados sensíveis e de menores. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-10 | Avaliar transferências internacionais pela Resolução CD/ANPD nº 19/2024. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-11 | Aplicar critérios de avaliação de risco de incidentes. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-12 | Preparar comunicação de incidente à ANPD e titulares, quando exigida. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-13 | Manter registros de incidentes pelo período exigido. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-14 | Avaliar necessidade de relatório de impacto. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
| BR-15 | Verificar regras consumeristas, contratuais e de comércio eletrônico. | pendente_externo | Avaliar alcance territorial da LGPD e obrigações condicionais se houver tratamento abrangido; Europa pretendida não comprova inaplicabilidade. Revisão jurídica pendente. |
## PAY

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| PAY-01 | Utilizar processador de pagamentos confiável e adequado à operação. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-02 | Avaliar escopo de PCI DSS. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-03 | Evitar armazenar dados de cartão quando não houver necessidade. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-04 | Verificar autenticidade de webhooks. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-05 | Testar pagamentos duplicados e requisições repetidas. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-06 | Validar valores no backend, não no navegador. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-07 | Verificar impostos e moeda conforme jurisdição. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-08 | Testar assinatura, renovação, upgrade e downgrade. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-09 | Testar falha de cobrança e recuperação. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-10 | Implementar reconciliação entre pagamentos e registros internos. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-11 | Testar cancelamento e reembolso. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
| PAY-12 | Aplicar trilha de auditoria para operações financeiras. | nao_aplicavel_ao_escopo | Sem cobrança/cartões/assinatura; cupons continuam no escopo de API/DB. |
## INF

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| INF-01 | Configurar HTTPS e TLS corretamente. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-02 | Revisar DNS, domínios, certificados e renovação automática. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-03 | Aplicar regras de firewall e segurança de rede. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-04 | Restringir portas e serviços não utilizados. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-05 | Separar ambientes de teste e produção. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-06 | Aplicar privilégio mínimo a usuários e serviços cloud. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-07 | Proteger painéis administrativos e consoles. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-08 | Configurar atualizações de segurança. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-09 | Verificar imagens de contêiner e usuários de execução. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-10 | Proteger storage, backups e snapshots. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-11 | Implementar mitigação proporcional contra DDoS e abuso. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-12 | Revisar configurações públicas de buckets, bancos e APIs. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-13 | Implementar controle de mudanças na infraestrutura. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-14 | Definir limites financeiros de infraestrutura e alertas de consumo. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
| INF-15 | Testar restauração de configurações essenciais. | pendente_externo | Inspecionar DNS/TLS/consoles/rede/contas/budgets nos provedores e comprovar configuração; não há acesso de gerenciamento configurado. |
## DR

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| DR-01 | Definir RPO: perda máxima de dados aceitável. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-02 | Definir RTO: tempo máximo de recuperação aceitável. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-03 | Realizar backups automáticos de dados críticos. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-04 | Manter cópias independentes dos ambientes principais. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-05 | Verificar proteção contra exclusão e comprometimento simultâneo dos backups. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-06 | Criptografar e controlar acesso aos backups. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-07 | Realizar restauração integral em ambiente isolado. | parcial | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-08 | Realizar restauração pontual quando suportada e necessária. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-09 | Validar integridade referencial dos dados restaurados. | parcial | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-10 | Testar recuperação de arquivos, segredos e configurações. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-11 | Testar indisponibilidade do banco e serviços de autenticação. | parcial | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-12 | Documentar etapas de recuperação. | parcial | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-13 | Identificar quem pode executar recuperação emergencial. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-14 | Testar rollback de deployment e migrações compatíveis. | parcial | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
| DR-15 | Registrar o tempo real de restauração e confrontar com RTO/RPO. | pendente_externo | Definir RTO/RPO, restaurar dados e arquivos reais em isolamento, medir recuperação e ensaiar retorno coordenado com responsável. |
## OPS

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| OPS-01 | Criar dashboards de disponibilidade, latência e erros. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-02 | Monitorar uso de CPU, memória, disco, conexões e filas. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-03 | Criar alertas de erros de autenticação anormais. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-04 | Monitorar operações administrativas e mudanças de permissões. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-05 | Monitorar padrões suspeitos de acesso a dados. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-06 | Detectar picos de consumo de APIs externas. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-07 | Monitorar consumo financeiro de infraestrutura e modelos de IA. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-08 | Centralizar logs com controle de acesso e períodos de retenção definidos. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-09 | Evitar registrar segredos, senhas, tokens e dados sensíveis desnecessários. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-10 | Implementar identificadores de correlação para investigações. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-11 | Definir severidade e responsáveis por incidentes. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-12 | Criar procedimentos de contenção, investigação, recuperação e comunicação. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-13 | Realizar simulação de incidente com a equipe. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-14 | Testar alertas e confirmar que são recebidos pelo responsável. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
| OPS-15 | Preparar comunicação com clientes afetados e assessoria jurídica quando necessária. | pendente_externo | Configurar limites/destinatários/retencão nos painéis, disparar alertas de teste e confirmar recebimento; ensaio com responsável pendente. |
## WARM

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| WARM-01 | Definir perfil esperado de usuários ativos e concorrentes. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-02 | Estabelecer um baseline de latência e utilização. | parcial | Medições de concorrência/query no PostgreSQL sintético estão registradas. Medir HTTP/Edge/Auth/filas hospedadas e registrar p50/p95/p99, duração e erros sob tráfego-alvo. |
| WARM-03 | Testar inicialização a frio de serviços serverless. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-04 | Testar capacidade de pools de conexão com o banco. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-05 | Configurar e validar cache onde aplicável. | parcial | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-06 | Verificar comportamento de cache vazio, expirado e invalidado. | parcial | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-07 | Testar filas e trabalhadores assíncronos. | parcial | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-08 | Confirmar quotas contratadas de APIs e provedores externos. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-09 | Verificar limites de envio de e-mail e mensagens. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-10 | Configurar SPF, DKIM e DMARC para e-mail. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-11 | Planejar aumento gradual do volume de mensagens quando aplicável. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-12 | Testar escalabilidade horizontal ou vertical, conforme arquitetura. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-13 | Verificar alarmes de custo em cenários de pico. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-14 | Exercitar failover onde houver redundância. | pendente_externo | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
| WARM-15 | Preparar redução de tráfego ou desligamento seletivo de funcionalidades em emergência. | parcial | Definir tráfego-alvo e quotas reais; executar cold start, carga/soak e limites em staging, sem confundir PostgreSQL sintético com capacidade hospedada. |
## FUNC

| ID | Requisito original | Estado | Próxima ação / limite |
|---|---|---|---|
| FUNC-01 | Testar todas as jornadas principais do usuário. | parcial | Completar jornadas hospedadas/teclado/leitor de tela/contraste e WebKit/iPad; Chromium local e mocks não substituem esses cenários. |
| FUNC-02 | Executar testes de regressão após correções de segurança. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| FUNC-03 | Testar entradas vazias, inválidas, longas e inesperadas. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| FUNC-04 | Testar operações concorrentes. | verificado_localmente | Evidência local restrita ao controle descrito; repetir após mudanças e não estender a configuração hospedada. |
| FUNC-05 | Verificar mensagens de erro compreensíveis. | parcial | Completar jornadas hospedadas/teclado/leitor de tela/contraste e WebKit/iPad; Chromium local e mocks não substituem esses cenários. |
| FUNC-06 | Testar navegação em dispositivos móveis. | parcial | Completar jornadas hospedadas/teclado/leitor de tela/contraste e WebKit/iPad; Chromium local e mocks não substituem esses cenários. |
| FUNC-07 | Testar navegadores relevantes ao público. | parcial | Completar jornadas hospedadas/teclado/leitor de tela/contraste e WebKit/iPad; Chromium local e mocks não substituem esses cenários. |
| FUNC-08 | Validar fusos horários, datas e formatos de valores. | parcial | Métricas foram alinhadas a UTC; validar bordas de data/DST, formato de preço e contexto local por loja com operadores. |
| FUNC-09 | Validar internacionalização, idioma e moeda. | parcial | Completar jornadas hospedadas/teclado/leitor de tela/contraste e WebKit/iPad; Chromium local e mocks não substituem esses cenários. |
| FUNC-10 | Testar comportamento sem rede e com conexão instável. | parcial | Completar jornadas hospedadas/teclado/leitor de tela/contraste e WebKit/iPad; Chromium local e mocks não substituem esses cenários. |
| FUNC-11 | Testar acessibilidade com teclado. | parcial | Há botões/labels e jornadas Chromium; terminar ensaio de teclado completo, foco do tutorial/modal e retorno ao fluxo. Não inferir WCAG completa de atributos HTML. |
| FUNC-12 | Verificar contraste, foco, rótulos e compatibilidade com leitores de tela. | parcial | Labels melhorados e modal identificado. Auditoria completa de contraste, foco e leitores de tela ainda pendente. |
| FUNC-13 | Utilizar WCAG 2.2 como referência técnica de acessibilidade, ajustando aos requisitos legais aplicáveis. | parcial | Completar jornadas hospedadas/teclado/leitor de tela/contraste e WebKit/iPad; Chromium local e mocks não substituem esses cenários. |
| FUNC-14 | Testar exportações e importações de dados. | parcial | CSV de sessões/estatísticas/histórico/modelo usa helper seguro. Parser e falha parcial do importador têm regressões. Confirmar exportações/importações reais, filtros e autorização em staging; o histórico é explicitamente restrito aos 200 eventos carregados. |
| FUNC-15 | Validar onboarding e orientações de uso. | parcial | Completar jornadas hospedadas/teclado/leitor de tela/contraste e WebKit/iPad; Chromium local e mocks não substituem esses cenários. |
