# Dependências e exceção temporária

Revisão técnica: 07/11/2026. Responsável pela revisão humana final: Costanzo Annichini. Essa revisão humana permanece pendente.

`glob` foi atualizado para 14.0.4 e os consumidores de `minimatch` 7–10 passaram para 11.0.5 por overrides limitados às faixas afetadas. Node 24 satisfaz os engines. APIs usadas pelo bundler/parser foram verificadas pelos tipos, lint, unidade, builds e jornadas. Não foi aplicada a sugestão automática de downgrade da PWA para apagar alertas.

Resta um problema subjacente sem versão corrigida publicada nesta consulta: deepmerge 4.3.1, GHSA-gcqx-w48m-w2h4. O npm conta também seus consumidores `@rollup/plugin-node-resolve`, `workbox-build` e `vite-plugin-pwa`, totalizando quatro alertas baixos. É ferramenta de build, ausente das dependências de produção. Os dados dos visitantes não chegam ao merge de opções do resolver. Isso reduz a exposição; não apaga o aviso nem certifica toda a cadeia.

A mitigação temporária está em `config/dependency-exceptions.json`, limitada a esses pacotes, severidade baixa e advisory exato, com vencimento em 07/12/2026. `npm run audit:dependencies` falha para advisory desconhecido, severidade maior, falha de consulta ou exceção vencida. Não há exceção para dependências de produção. A CI usa tokens somente de leitura e não entrega secrets de deploy aos PRs. Branch protection e revisão obrigatória de CODEOWNERS ainda precisam ser confirmadas no GitHub real.

Antes de uma operação com dados reais, o mantenedor deve rever essa decisão e verificar se há versão corrigida. Substituir uma biblioteca ou migrar o gerador de service worker exige validar atualização/offline/cache; uma troca apenas para zerar o contador pode introduzir falhas de funcionamento ou armazenamento indevido.
