# Revisão técnica para publicação — Suaipe

Data: 03/11/2026. Branch: `fix/security-and-release-hardening`.

A revisão cobre o código disponível, o histórico de migrações, a configuração de build/CI e testes locais. Não houve acesso ao Supabase de produção, envio real de e-mails nem implantação. Os resultados abaixo não certificam as permissões atualmente instaladas no serviço hospedado.

## Problemas tratados nesta branch

| Área | Problema observado | Alteração |
|---|---|---|
| Permissões | A exclusão global de sessões e operações administrativas tinham proteção insuficiente | Restrição por cargo, MFA e retenção mínima; testes SQL com diferentes perfis |
| Dados comerciais | O cliente podia enviar valores e estado de processamento da sessão | RPC valida a solicitação e obtém produto, preço e desconto do catálogo no servidor |
| Repetições | Uma falha de rede podia gerar outra sessão ou novo envio | UUID e conteúdo estáveis nas tentativas; reserva atômica do envio |
| E-mail | Dados recebidos pelo webhook eram usados sem reserva persistida de processamento | Destinatário e dados canônicos do banco; estados de entrega e reconciliação explícita |
| Descontos | Validade configurada no navegador não correspondia a uma regra garantida no banco | Expiração persistida de 24 horas; resgate exige loja, perfil, MFA e validade |
| Privacidade | O service worker guardava consultas REST autenticadas em cache | Remoção do cache de API e limpeza do cache legado na ativação |
| Quiosque | Loja ausente, catálogo vazio/inativo e atualização parcial podiam produzir fluxos incorretos | Bloqueio da coleta sem configuração utilizável, preservação do cache válido e reset por inatividade |
| Login e métricas | Registro de tentativa não era consumido; filtros do funil divergiam | Execução efetiva da auditoria e aplicação dos mesmos filtros de loja/data |
| Dependências | A árvore original apresentava alertas altos e críticos | Atualizações compatíveis e atualização de Vite/Vitest; Node 24 em CI |
| Documentação | Promessas incorretas sobre recuperação de backup e validade dos códigos | Descrições alinhadas às garantias verificáveis |

## Evidência de validação

- TypeScript: passou.
- ESLint: zero erros, quatro avisos de Fast Refresh já existentes.
- Aplicação: 155 testes passaram em 22 arquivos.
- Banco: 24 verificações SQL passaram em PostgreSQL 17, com replay das migrações e substitutos mínimos de Auth/Storage do Supabase.
- Build e atendimento HTTP das rotas/arquivos: passaram com configuração fictícia de backend.
- Dependências: zero alertas altos/críticos; seis moderados em produção. Incluindo desenvolvimento: 25 moderados e dois baixos.
- Playwright: 16 testes descobertos; execução e comparação visual pendentes. Downloads do WebKit foram bloqueados pela política de rede.

## Pendências antes de divulgação pública

1. **Validar em staging.** Aplicar migração, funções e frontend em conjunto; testar autenticação/MFA, isolamento de lojas, envio real e expiração. O frontend antigo deixa de gravar após a migração. A ordem está em [security-hardening.md](security-hardening.md).
2. **Executar os testes de navegador e revisar no iPad.** Confirmar teclado, enquadramento, zoom, contraste, foco e recuperação após inatividade. Não substituir imagens de referência para esconder regressões.
3. **Preparar uma demonstração isolada.** Hoje o visitante sem loja configurada recebe indisponibilidade. Uma demonstração pública deve usar dados sintéticos e não expor contatos nem métricas reais de clientes.
4. **Revisar prevenção de abuso.** O PIN compartilhado mantém fallback RPC e limitador em memória. A consulta pública de cooldown permite inferir atividade recente de um endereço. O limite por e-mail não impede abuso com endereços diferentes.
5. **Concluir verificações operacionais.** Revisar paginação e segurança de exportação CSV, retenção no Sheets, restauração de backup, privacidade e reconciliação de e-mails ambíguos. A aceitação pelo provedor não comprova entrega na caixa postal.
6. **Conferir o material do portfólio.** Distinguir resultados reais e simulados; revisar números de desempenho e afirmações comerciais. Consentimento registrado isoladamente não comprova conformidade com GDPR/LGPD.

As mudanças reduzem falhas concretas e acrescentam regressões verificáveis. A liberação para uso real ainda depende da validação de navegador e das integrações hospedadas acima.
