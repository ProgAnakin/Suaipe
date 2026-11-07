# Incidentes, recuperação e validação operacional

07/11/2026. Responsável técnico proposto: Costanzo Annichini. Contato de emergência, substituto, RTO, RPO, franquias e destinatários de alertas ainda precisam ser definidos pelo operador antes de dados reais. Essa ausência não é resolvida por criar um arquivo ou um cron.

## Resposta

| Cenário | Contenção imediata | Verificação e recuperação |
|---|---|---|
| Exposição de contatos / acesso cruzado | Suspender coleta e rotas afetadas, preservar evidência minimizada; não exportar a base para ferramentas de IA | Determinar escopo/atores/tokens e caminho de acesso; corrigir e testar com perfis A/B; avaliar obrigações de comunicação aplicáveis |
| Secret administrativo comprometido | Revogar/rotacionar a credencial efetivamente afetada no provedor e substituir bindings pelos canais seguros | Testar que a chave anterior foi invalidada; revisar acessos privilegiados; atualizar funções/scheduler de forma coordenada |
| Auth/SQL indisponível | Manter negação por padrão; usar demo somente se identificada como fictícia | Verificar provider status, rede e logs sem PII; não restaurar INSERT público, PIN público ou remover MFA para destravar |
| E-mail com estado ambíguo | Suspender novos retries daquele envio e conferir ID/aceite no Brevo | Preservar cupom; reconciliar inbox/bounce e registro SQL; não resetar sending/uncertain em massa |
| Sheets/integração falha | Manter recurso opcional desativado e registrar necessidade de reconciliação | Conferir destino/quotas/contrato e permissão de marketing; relay não é outbox durável nem prova de sincronização |
| Exclusão acidental | Pausar mutações/coleta, isolar cópia de recuperação, preservar auditoria e supressões mais recentes | Restaurar SQL e arquivos em isolamento; conferir integridade e reprocessar exclusões/retiradas posteriores antes de reabrir |
| Relatório incorreto / exportação parcial | Não usar o arquivo como base para campanha ou decisão; restringir período e repetir | Validar filtros/UTC/contagem/snapshot; paginação HTTP não é snapshot transacional de qualquer mutação |

Classificação operacional proposta: crítica para exposição de PII/secret privilegiado/escalada; alta para integridade ou indisponibilidade de coleta; moderada para integração opcional sem perda silenciosa. O operador deve confirmar escalonamento e responsável por comunicação. Registrar hora UTC, commit, função/UUID de sessão quando necessário, ação, resultado e próximo responsável; não copiar senhas/tokens/corpos de requisição/destinatários para logs públicos.

Prazos e comunicações à autoridade/titulares dependem da jurisdição, natureza e risco. Não reutilizar uma regra genérica de “72 horas LGPD/GDPR” sem verificar os requisitos atuais aplicáveis. A decisão jurídica e comunicação externa cabem ao responsável, com assessoria quando necessária. Nenhuma notificação foi enviada nesta execução.

## Restore real e retorno

1. Definir RTO/RPO pelo impacto de perda/indisponibilidade e confirmar plano de backup e retenção do provedor.
2. Preservar backup SQL **e** objetos de Storage, configuração das quatro funções, versões e nomes dos secrets, configuração de Auth/DNS e artefato vigente. Não versionar valores ou backups de clientes neste repositório.
3. Proteger cópia independente com criptografia/acesso mínimo e proteção contra exclusão simultânea. Verificar se backups do plano incluem Storage/roles/secrets; não presumir.
4. Restaurar em ambiente isolado com rede de e-mail/CRM desligada. Usar procedimento adequado ao backup real, em vez de apontar o runner de testes local para produção.
5. Conferir contagens/integridade, funções, RLS, papéis/MFA, anonimato negado, arquivos e capacidade de receber somente registros sintéticos. Registrar início/fim e confrontar com RTO/RPO.
6. Reaplicar exclusões/retiradas posteriores usando um registro protegido independente. Uma fila que só existe no mesmo banco pode voltar a um estado antigo junto com o restore.
7. Reconciliar efeitos externos e código do cupom antes de reenvio. Ensaiar retorno coordenado de SQL, Edge e frontend; frontend antigo sozinho não é rollback compatível.
8. Conferir `/release.json`, atualizar PWAs, reabrir uma unidade por vez e observar erros, quotas, avisos e logs.

`npm run test:restore` prova apenas dump/restore com dados sintéticos em PostgreSQL local. O resultado não valida RTO/RPO, arquivos, plano contratado ou recuperação real do Supabase.

## Carga, disponibilidade e monitoramento

- Definir usuários/lojas simultâneos, sessões/hora, tamanho do catálogo, período de exportação e volume de e-mail. As quotas atuais não são dimensionamento comprovado.
- Medir staging com dados sintéticos: cold/warm start, p50/p95/p99, taxa de erro, concorrência de claim/reserva, conexões, memória, filas e saturação de fornecedores. Aumentar gradualmente com um teto de custo autorizado e uma forma de interrupção.
- Testar 429/5xx/timeout, falta de conexão, retorno do serviço e suspensão do iPad. Não executar carga nem scanner ativo contra produção para preencher um checklist.
- Confirmar SPF/DKIM/DMARC, sender, quotas e caixa de entrada separadamente do aceite transacional. Campanhas e aquecimento de domínio não estão implementados.
- Configurar dashboards e alertas nativos do plano para disponibilidade/latência/erros, abuso de Auth/PIN, mudanças administrativas e orçamento. Confirmar destinatário real e disparar evento sintético controlado.
- `privacy-maintenance.yml` faz saúde por hora e retenção diária quando habilitado. GET não apaga nem renova readiness; POST realmente aplica retenção. Cron do GitHub depende da branch padrão e não tem garantia de pontualidade. Conferir consumo de minutos.
- O cron de dependências e Dependabot estão versionados; só o painel confirma execução, notificações e branch protection. Nenhum limite financeiro, gratuidade ou recebimento de alerta foi presumido.

## Exercícios desta rodada

Localmente foram simulados: queda/espera/duplicação de claim; reserva concorrente; conta sem cargo/sem MFA; reset e resposta atrasada; Auth que nunca responde ao logout; falha do provider e redirect para endereço interno; tamanho de corpo e cancelamento hostil; imagens inválidas/bombas PNG; dump/restore sintético. Resultados e limites estão no relatório da rodada.

Falta um ensaio com o mantenedor operando os painéis reais e medindo recuperação, alertas e revogação. Esse ensaio e revisão independente continuam necessários para uma operação com dados de clientes.
