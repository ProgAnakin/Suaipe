# Registro de tratamento e procedimentos — minuta

07/11/2026. Responsável informado: Costanzo Annichini. Mercado pretendido: Europa (IT/PT/ES/FR). Esta é uma minuta operacional baseada no código e nas declarações do autor, sem parecer jurídico ou contratos confirmados.

## Inventário por finalidade

| Dado / finalidade futura | Local / destinatário | Prazo implementado / decisão pendente |
|---|---|---|
| Nome, sobrenome, e-mail para enviar o resultado solicitado | Navegador real → Supabase → Brevo transacional | Sessão 30 dias; prazos do provedor/logs/backups precisam ser confirmados |
| Respostas, produto, match, loja e datas para recomendação e métricas operacionais | Supabase e relatórios autorizados | Sessão/funil 30 dias; justificar necessidade de cada campo |
| Escolha/versão do aviso do resultado | Supabase, junto da sessão | 30 dias atuais; rever se esse prazo atende a comprovação necessária |
| Opt-in de marketing **opcional e separado** | Booleano false por padrão, versão própria e timestamp do servidor | Não há campanhas implementadas. Expira com a sessão de 30 dias; não reutilizar cadastros legados como opt-in |
| Cópia CRM opcional | Apps Script/Sheets somente se integração habilitada e opt-in não retirado | Prazo/supressão/exclusão externa precisam ser implementados e conferidos pelo operador |
| Sessões de staff, cargo/MFA, acessos, origem em hash e logs | Auth/SQL/Edge | Acessos/login 14 dias; auditoria 730 dias; prazos de Auth/hosting precisam ser confirmados |
| Erros técnicos opcionais | Sentry minimizado; sem replay, tracing e sessões automáticas | Verificar retenção, subprocessadores, acesso e base por finalidade antes de habilitar |
| Preferência de idioma e catálogo público | Navegador/worker | Sem marcador de e-mail; caches REST antigos são removidos. Catálogo não substitui readiness do banco |
| Requisições da demo pública | Hospedagem e entrega de conteúdo | A demo não pede dados de clientes, mas requisições podem gerar IP/logs técnicos; verificar retenção real |

Não há intenção declarada de coletar cartões, saúde, biometria ou dados de crianças. Preferências de produto não devem ser automaticamente classificadas como dado sensível; público-alvo, inferências e eventual coleta de menores precisam de avaliação antes de ampliar o escopo.

## Marketing futuro

Receber o resultado não autoriza campanhas. `VITE_ENABLE_MARKETING=false` e `app_config.marketing_enabled=false` são os padrões. Para aceitar a escolha opcional no futuro, configurar ambos após revisão de aviso, contato real monitorado, fornecedores, prazos e processo de retirada. O servidor exige booleano e versão `marketing-2026-11-07`; não aceita string "true" nem cria permissão retroativa para registros antigos.

O formulário oferece duas escolhas separadas, sem pré-seleção; a decisão opcional não condiciona o resultado. O pedido conserva sua escolha nas repetições. `withdraw_marketing_consent` exige gerente+MFA e registra retirada local auditada, preservando a evidência original. A aba Privacy oferece essa operação. Uma retirada local não envia uma supressão automaticamente à Brevo ou ao Sheets.

**Campanhas permanecem fora do escopo implementado.** Antes da primeira campanha, verificar propriedade do endereço/double opt-in quando apropriado, base/finalidade, filtros atuais, supressão/retirada em todos os fornecedores e mecanismo de cancelamento em cada mensagem. Um CSV do painel contém sessões para operação e análise; não é uma lista automaticamente elegível para marketing. O relay manual agora recebe só `session_id`, consulta registro canônico sob autorização e recusa ausência/retirada de opt-in. Nem booleano nem validação de formato provam que o visitante é dono do e-mail.

## Pedidos de titulares

1. Receber o pedido no contato real a definir, registrar protocolo e verificar identidade proporcionalmente ao risco. Não pedir documentos excessivos nem revelar se existe cadastro a um terceiro.
2. Acesso/portabilidade: usar “Export verified customer records”, que pagina `get_customer_records` por endereço exato sob gerente+MFA. O JSON inclui somente as sessões locais daquele titular e exclui o fingerprint interno; não representa todos os logs/fornecedores. Proteger a entrega e evitar anexar a lista completa. A aplicação não oferece um lookup público nem verifica sozinha a identidade de quem apresentou o pedido.
3. Correção: após verificar o pedido, usar “Apply verified name correction”. `correct_customer_names` valida nome/sobrenome no servidor, restringe ao endereço exato e audita a alteração sem copiar os nomes para o histórico. Alteração de e-mail exige processo administrado de exclusão/recoleta e reconciliação externa; não trocar silenciosamente o conteúdo de uma solicitação idempotente. Conferir também os fornecedores que receberam os nomes anteriores.
4. Exclusão: usar a operação protegida; conferir fila Brevo/Sheets, CSVs já baixados, logs, versões e backups conforme política/obrigação aplicável. Só confirmar conclusão externa após prova ou não aplicabilidade verdadeira.
5. Retirada de marketing: registrar a retirada local, suspender campanhas e reconciliar supressão no fornecedor. Anotar data e operador; não apagar a evidência original nem tratar como nova adesão.
6. Responder pelo canal verificado, registrar prazo aplicável, execução e pendências. Na restauração de backup, reaplicar exclusões/supressões posteriores antes de reabrir o serviço; a fila atual no mesmo banco não é uma cópia independente contra desastre.

## Contratos, bases e jurisdição

O código registra escolha do visitante para o resultado e uma escolha adicional para marketing futuro. A definição jurídica definitiva por finalidade, necessidade de cada campo, RoPA, DPIA/DPO, regras de comunicações eletrônicas e eventuais exceções dependem da operação e devem ser revisadas. Uso público na Europa pode gerar obrigações mesmo em portfólio por logs técnicos. Brasil/LGPD é condicional a eventual alcance territorial/tratamento; não é descartado apenas porque o autor escolheu Europa.

Confirmar região e papéis de Vercel, Supabase, Brevo, Google e Sentry, contratos de processamento/suboperadores, transferências e salvaguardas, retenção dos painéis e forma de revogação. Não presumir residência europeia ou contratos assinados. Dados reais e tokens não devem ser usados em prompts, arquivos de teste ou relatórios públicos.

O endereço fictício de exemplo só cabe à demonstração. Uma operação real exige contato funcional, identificação adequada e direitos atendidos. Os três textos enviados são referências de escopo; suas estatísticas, referências e alegações legislativas não foram tratadas como fatos jurídicos verificados.
