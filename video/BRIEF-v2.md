# BRIEF v2 — Filme Suaipe (Remotion) · versão "carreira B2B"

> **Como usar:** salve este arquivo como `video/BRIEF-v2.md` no branch `claude/youthful-babbage-W9gm1`, abra o Claude Code na raiz do repo com o Opus 5.5, entre em **Plan Mode** e envie:
> `Leia video/BRIEF-v2.md por inteiro e execute-o fase por fase. Pare nos checkpoints marcados com ⛔.`
>
> Antes de enviar, preencha todos os campos `[PREENCHER]` da seção 3. Campo que você deixar vazio = o agente **não** usa aquela informação (nunca inventa).

---

## 1. Seu papel

Você é, ao mesmo tempo:

- **Diretor criativo / motion designer sênior** — referência de acabamento: filmes de lançamento da Apple, Linear, Stripe e Vercel. Movimento com intenção, ritmo musical, tipografia impecável, nada "template".
- **Estrategista de marca pessoal B2B** — sabe o que faz um *hiring manager* de vendas B2B / SaaS / Retail Tech parar o scroll no LinkedIn e pensar "quero conversar com essa pessoa".
- **Engenheiro Remotion rigoroso** — mudanças pequenas, verificáveis, com QA numérico e visual a cada etapa.

Você está melhorando um filme **que já existe e já é bom**. Não reescreva do zero. Preserve o que funciona, corte o que não serve ao objetivo, refine o resto.

---

## 2. Contexto (o que já existe — leia antes de propor qualquer coisa)

- **Produto:** Suaipe, quiosque PWA para iPad em lojas de varejo tech. Cliente faz 8 swipes estilo Tinder → algoritmo recomenda 1 produto → código de desconto único + e-mail personalizado em 5 idiomas → loja captura um lead *first-party* com consentimento GDPR. Painéis de staff: `/manager`, `/stats` (funil, ranking de produtos, histograma de match, distribuição horária), `/consulente` (guias de treinamento). Em produção em 4 lojas.
- **Filme atual:** `video/` (projeto Remotion isolado). Leia **obrigatoriamente**, nesta ordem:
  `video/README.md` → `video/LINKEDIN.md` → `docs/adr/007-product-film-with-remotion.md` → `video/src/timeline.ts` → `video/src/SuaipeFilm.tsx` → `video/src/presentations.tsx` → todas as cenas em `video/src/scenes/` → `video/src/components/Caption.tsx`, `FilmGrade.tsx`, `Backdrop.tsx` → `video/src/lib/motion.ts`, `camera.ts` → `video/audio/qa/report.md` → `video/tools/*/README.md` → `CLAUDE.md` da raiz.
- **Arquitetura que deve ser respeitada:**
  - `timeline.ts` é a **única fonte de verdade** de tempo (segundos, grade de 120 BPM, 60 fps, 1080×1350).
  - Após qualquer mudança de tempo: `npm run cues` → `python tools/audio/generate.py` → render. Imagem e som ficam travados por frame.
  - Telas do iPad/iPhone são **capturas reais** do app (`tools/capture`). Nunca substitua por mockups.
  - As 4 fotos de loja (`public/people/`) são **geradas por IA** (só mãos) e precisam ser declaradas como tal.
  - `video/` nunca é importado por `src/` nem entra no build do app.
- **Estado atual (44,5 s):** Hook "Too many gadgets. / One perfect match." → lock-up → hand-off do tablet (foto) com fly-in para a tela real → welcome/digitação/GDPR → 8 swipes → contador 98 % + confete → sucesso → iPhone com e-mail e código → diagrama de sistema (multi-store, 2FA, RLS) → sacola + aperto de mão → end card "Live in 4 retail stores" + cidades + `REACT · SUPABASE · PWA`.

---

## 3. Fatos que eu forneço (fonte de verdade — **nunca invente nada além disto**)

| Campo | Valor |
|---|---|
| Meu nome como deve aparecer no filme | [PREENCHER — ex.: Costanzo Annichini] |
| Meu cargo atual (como quero me posicionar) | [PREENCHER — ex.: Tech Retail Consultant · B2C] |
| Cargo que busco | [PREENCHER — ex.: B2B Account Executive / Retail Tech Sales] |
| Frase de posicionamento (1 linha) | [PREENCHER ou deixe o agente propor 3 opções] |
| Métricas **reais** e verificáveis (sessões, leads, taxa de opt-in, códigos resgatados, tempo médio) | [PREENCHER — se vazio, o filme não mostra NENHUM número de resultado] |
| Tenho autorização do empregador para mostrar lojas/nomes de cidades? | [PREENCHER sim/não] |
| Posso fotografar mãos reais na loja (sem rostos, sem marcas)? | [PREENCHER sim/não — se sim, onde estarão os arquivos] |
| CTA final | [PREENCHER — ex.: "Open to B2B sales roles" / link do perfil / nenhum] |
| Idiomas de legenda extra (.srt) | [PREENCHER — ex.: IT, PT] |

**Regra de ouro:** nenhum número, cliente, resultado ou depoimento que não esteja nesta tabela pode aparecer no filme, no post ou na capa. Dados do seed `supabase/seed/demo-dashboard-data.sql` são **demo**: se aparecerem na tela, os números devem estar ilegíveis (blur/escala) ou rotulados claramente como "demo data".

---

## 4. O objetivo real (é isto que define "melhor")

O filme não é para vender o Suaipe. É para **me vender** como profissional de vendas que:

1. **Entende o problema do varejo pelo lado de quem vende** (eu estou no chão de loja todo dia).
2. **Transforma isso em solução com IA e tecnologia**, sozinho, de ponta a ponta.
3. **Fala a língua de resultado de negócio** — lead, conversão, dados do cliente, produtividade do consultor — e não só de stack técnica.

**Público-alvo do vídeo (em ordem):** hiring managers de vendas B2B / SaaS; diretores de varejo e de experiência em loja; recrutadores de Retail Tech. Não é um público de desenvolvedores.

**Critérios de sucesso** (use-os para julgar cada decisão):

- Nos **primeiros 2 s**, com som desligado, a pessoa entende que existe um problema de venda em loja.
- Até o fim, ela consegue responder: *o que é, que valor gera para a loja, e quem fez*.
- A última impressão é **o meu nome + meu posicionamento**, não a stack.
- Nada parece "template de IA": movimento contínuo, sem pulos, sem elementos genéricos.
- Tudo o que é afirmado é verdadeiro e defensável numa entrevista.

---

## 5. Regras inegociáveis

1. Trabalhe no branch `claude/youthful-babbage-W9gm1`. Commits pequenos e temáticos (um por fase/tema), mensagens em inglês no estilo dos commits existentes (`feat(video): …`, `fix(video): …`).
2. Não altere nada fora de `video/`, exceto docs (`docs/adr/007…`, `CLAUDE.md`) se a arquitetura do filme mudar.
3. Não remova o sistema de QA existente (cues, report de áudio, contact sheets). Melhore-o se precisar.
4. Não adicione dependências sem justificar no plano. Prefira o que já está instalado (`@remotion/transitions`, `motion-blur`, `effects`, `noise`, `paths`).
5. Nunca invente métricas, logos de clientes, depoimentos ou nomes de empresas. Nenhuma marca de terceiros visível (inclusive do meu empregador) sem o "sim" da seção 3.
6. Se `npm ci` ou o download do Chrome do Remotion falhar por rede, use `REMOTION_BROWSER` com um Chromium já instalado (ver `video/README.md`) e me avise; não contorne políticas de rede.
7. ⛔ **Pare e me pergunte** antes de: mudar a duração total em mais de ±5 s; remover uma cena inteira; trocar paleta ou tipografia da marca; substituir as fotos de loja; mudar qualquer afirmação factual; trocar o gênero/andamento da trilha; usar qualquer áudio que não seja sintetizado em código (samples, bibliotecas, música licenciada).
8. **Autorização explícita sobre o áudio:** os ganhos congelados (`FROZEN_GAINS_DB`) e as seeds preservadas dos primeiros 33 s (`ADDED_SINCE_V1`) protegiam uma versão já aprovada. Esta revisão **muda a imagem e o tempo**, então você está autorizado a recalibrar (`--recalibrate`) e a re-sortear sons, desde que documente o que mudou e por quê no `tools/audio/README.md`.

---

## 6. Fase 1 — Auditoria (não altere código nesta fase)

1. `cd video && npm ci && npm run typecheck`.
2. Renderize o filme atual (`npm run render`, ou em escala reduzida para ganhar tempo, ex.: `--scale=0.5`) e gere contact sheets a cada **0,25 s** com `scripts/qa-sheets.sh` (ajuste a variável `FF` para o ffmpeg desta máquina). Olhe **todas** as folhas.
3. Gere também stills em resolução total nos frames de transição (início, meio e fim de cada `TransitionSeries.Transition`) e em cada pico da `timeline.ts`.
4. Produza `video/qa/AUDIT.md` com:
   - **Tabela de problemas** com timecode, cena, categoria (narrativa · legibilidade · fluidez · composição · cor · tipografia · áudio · veracidade), severidade (P0/P1/P2) e correção proposta.
   - **Nota de 1 a 10** por cena para: clareza da mensagem, fluidez do movimento, acabamento visual, adequação ao público B2B.
   - **Teste de leitura das legendas:** para cada legenda, palavras × tempo na tela. Mínimo exigido: `0,6 s + 0,3 s por palavra`. Liste todas que ficam abaixo.
   - **Teste de fluidez nas transições:** em cada corte/transição, compare a velocidade e a direção do movimento na saída e na entrada (posição em px/frame dos elementos principais nos 6 frames antes e depois). Sinalize toda descontinuidade de velocidade, "pop" de opacidade em menos de 3 frames que não seja intencional e qualquer easing linear em posição/escala.
   - **Teste dos 2 primeiros segundos** e do **primeiro frame** (autoplay mudo no LinkedIn): o que uma pessoa entende vendo apenas isso?
   - **Teste de áreas seguras:** nada essencial nos ~8 % inferiores nem nos cantos (controles e overlays do player cobrem essas regiões no feed).
   - **Auditoria de áudio** (detalhes na Fase 4, item 4.1): densidade de efeitos por segundo, hierarquia, caráter de cada seção e coerência com o tom do post.
5. ⛔ **Checkpoint:** me mostre o resumo da auditoria (top 10 problemas + notas) e espere meu ok.

---

## 7. Fase 2 — Narrativa e roteiro (proposta antes de implementar)

Reestruture a história para o público B2B mantendo o máximo do material atual. Estrutura-alvo (tempos aproximados, ajuste à grade de 120 BPM):

| Bloco | ~Tempo | Função | Notas |
|---|---|---|---|
| 1. Hook | 0–3 s | Problema **do ponto de vista da loja/vendedor** | Ex. de direção: escolha demais para o cliente, conversa que não acontece, cliente que sai sem deixar contato. Sem estatísticas não fornecidas. |
| 2. Ideia | 3–6 s | Lock-up Suaipe + promessa em 1 linha | Mantém o lock-up atual, revisa a tagline. |
| 3. Experiência | 6–24 s | Hand-off → swipes → match | **Comprima**: welcome/digitação/GDPR hoje ocupa ~5 s; reduza o que não agrega, mantendo o consentimento GDPR visível (é argumento de venda). |
| 4. Valor para o cliente | 24–31 s | E-mail + código único | Pode encurtar o scroll do e-mail. |
| 5. **Valor para a loja** (novo/reforçado) | 31–37 s | O que o gerente ganha | Troque o jargão (RLS, 2FA) por valor de negócio: lead com consentimento, dado por loja, funil medível, consultor mais produtivo. Considere capturar o `/stats` real (funil, ranking) com `tools/capture` — **números ilegíveis ou "demo data"** se não forem reais. Detalhes técnicos podem virar 1 linha pequena. |
| 6. Fechamento humano | 37–41 s | Sacola + aperto de mão | "A tecnologia não substitui o vendedor" — é o meu argumento central. |
| 7. **Assinatura** (novo) | 41–45 s | Quem fez e por quê | Nome + posicionamento + CTA da seção 3. "Built by a retail consultant, using AI" (ou melhor). Stack sai do end card e vai para o post. |

Entregue em `video/qa/SCRIPT.md`:

- **3 opções de hook** (texto na tela + descrição visual + por que funciona para quem contrata vendas B2B). Recomende uma.
- **Todas as linhas de texto na tela**, em inglês, com contagem de palavras e tempo de leitura. Regras de copy: frases curtas, verbos ativos, voz de resultado ("Every swipe becomes a qualified lead" > "Data is stored in Supabase"), no máximo 7 palavras por linha de legenda, sem ponto de exclamação, sem buzzwords vazias ("revolutionary", "game-changer").
- **Beat sheet** com os novos tempos já na grade de 120 BPM (início/fim de cada bloco, cada pico de animação e cada hit musical).
- **Roteiro sonoro** em paralelo ao visual: para cada bloco, a emoção-alvo, o estado da música (ver mapa da Fase 4) e os 1–3 efeitos que realmente importam ali.
- **Duas versões:** master (40–46 s, 4:5) e **cut-down de 15 s** (hook → swipes → match → assinatura) para reaproveitar em comentários, stories ou um segundo post.
- ⛔ **Checkpoint:** espere minha escolha de hook e meu ok no roteiro.

---

## 8. Fase 3 — Direção de arte e movimento (implementação)

Implemente o roteiro aprovado em incrementos, cada um com commit próprio. Padrões obrigatórios:

**Movimento e fluidez**
- Um **vocabulário de easing** único, definido em `lib/motion.ts` e documentado: entrada (ease-out forte), saída (ease-in), deslocamento de câmera (spring criticamente amortecido ou ease-in-out), "slam" (overshoot curto). Nenhum `interpolate` linear em posição, escala ou rotação.
- **Continuidade de velocidade** em todo corte: o elemento que sai em movimento entrega o vetor para o que entra (match-cut, whip ou motion-blur compartilhado). Use o teste da Fase 1 para provar que a descontinuidade sumiu.
- `CameraMotionBlur` só onde a velocidade realmente pede; mesmo `shutterAngle` em cenas vizinhas para o blur não "mudar de câmera".
- **Hierarquia de entrada:** no máximo 1 elemento principal entrando por vez; secundários com stagger de 2–4 frames. Toda informação importante fica **parada** (hold) tempo suficiente para ser lida.
- Respiração: ao menos um momento de ~0,5–1 s de calma relativa antes de cada grande hit (98 %, aperto de mão, assinatura).

**Composição e tipografia**
- Grid e margens consistentes (defina em `theme.ts`: margem lateral, linha de base das legendas, área segura inferior).
- Escala tipográfica com no máximo 4 tamanhos no filme inteiro; peso e tracking coerentes entre hook, legendas e end card.
- Contraste de texto ≥ 4.5:1 sobre o fundo real (meça nos stills, inclusive sobre as fotos).
- Legibilidade em celular: teste os stills reduzidos a 360 px de largura. Se não lê, aumenta ou corta texto.

**Cor e acabamento**
- Mantenha a paleta da marca (`theme.ts`). Unifique o grade das fotos de loja com o azul-marinho/ciano do app para que pareçam do mesmo filme.
- Grain, light leak e glow com intensidade discreta e constante; nada que pareça filtro.
- Se a seção 3 disser que tenho fotos reais: substitua as imagens de IA (`tools/people/fetch.mjs --from <pasta>`), re-meça `HANDOFF_QUAD` com `tools/people/measure_quad.py` e remova o aviso de IA dos textos.

**Assinatura (end card novo)**
- Nome, posicionamento e CTA da seção 3, com o mesmo cuidado do lock-up de abertura (é o "logo" do filme agora).
- As cidades só aparecem se a seção 3 autorizar.
- Últimos ~1,5 s estáveis e limpos: é o frame que fica na tela quando o vídeo termina.

---

## 9. Fase 4 — Som: trilha, efeitos e atmosfera

O áudio é sintetizado em código (`video/tools/audio`). Leia `tools/audio/README.md` inteiro e os arquivos `music.py` (`compose`), `sfx.py` (os ~50 designers de efeito), `instruments.py`, `mix.py` e `theory.py` antes de mexer.

O sistema é tecnicamente excelente: loudness, true peak, sincronia e harmonia travada no acorde. O objetivo agora é **caráter e enquadramento**: o som tem que soar como o post se lê.

### 4.0 Diagnóstico de partida (confirme ou refute na auditoria)

- **Densidade alta.** `audio/cues.json` tem cerca de **153 efeitos em 44,5 s**:
  - 33 teclas de digitação, 13 ticks de contador, 10 pops de tile;
  - ~14 efeitos no 1º segundo e ~23 no 11º segundo.
  Isso tende a soar "app de jogo / game show", não "produto premium B2B".
- **Linguagem de música eletrônica de festa.** A trilha usa drop A, drop B, riser, rufo de caixa acelerando e confete. Funciona para energia. Pode brigar com um post reflexivo de carreira ("vim do chão de loja, construí isto").
- **Cenas humanas.** A sacola e o aperto de mão são fotos de loja, mas o som ao redor delas é quase todo sintético e sem ambiente. Falta a sensação de "estar numa loja".

### 4.1 Auditoria de áudio (faz parte da Fase 1, sem alterar nada)

Gere e inclua no `AUDIT.md`:

1. **Gráfico de densidade:** efeitos por segundo, separados por camada (assinatura / suporte / textura, ver 4.3). Marque todo trecho com mais de 4 efeitos/s.
2. **Mapa emocional atual:** para cada seção do `cues.json`, descreva em 3 palavras o que a música transmite hoje. Compare com o que o roteiro novo pede.
3. **Inventário de timbres:** quantos "tipos" de som distintos existem (sinos, plucks, thumps, whooshes…). Liste quais competem entre si e quais se repetem demais.
4. **Teste de tradução para celular:** use a simulação já existente (HP 350 Hz + LP 10 kHz). Quais momentos perdem impacto ou somem?
5. **Teste de reencode:** codifique o master em AAC 128 kbps (o que as plataformas tendem a servir) e meça de novo true peak e loudness. Reporte se o limitador precisa de mais margem.

### 4.2 Atmosfera-alvo (o "enquadramento")

O post conta: *alguém que vende em loja todo dia, que viu um problema e o resolveu com tecnologia, e que entende que a venda continua humana.* A trilha deve soar:

- **Confiante, não eufórica** — energia contida, sem "drop de festival".
- **Premium e limpa** — poucos elementos, cada um com espaço. Referência de clima: filmes de produto da Apple, Stripe Sessions e Linear (não copie nada, é só direção).
- **Quente e humana no fim** — o fechamento tem que soar como gente, não como interface.
- **Calma o bastante para ser re-assistida** — ninguém deve sentir cansaço na 2ª visualização.

Antes de implementar, proponha em `video/qa/SOUND.md`:

- **3 palavras-chave de atmosfera** que valham para a trilha *e* para o texto do post.
- **2 direções sonoras alternativas**, cada uma com uma descrição de 3–4 linhas:
  - instrumentação;
  - densidade de bateria;
  - onde fica o maior momento;
  - como termina.

  Exemplos de direção (não obrigatórios): *"Minimal pulse"* — pulso suave em meio-tempo, pads quentes, sem caixa nem rufo, um único momento grande. *"Confident build"* — mantém a estrutura atual com bateria mais leve, sem confete sonoro, crescendo até a assinatura.
- A sua recomendação e por quê.
- ⛔ **Checkpoint:** espere minha escolha de direção.

### 4.3 Hierarquia e limpeza de efeitos

Classifique **todo** efeito em uma de três camadas e aplique as regras:

| Camada | O que é | Regra |
|---|---|---|
| **Assinatura** | Hook, logo, 98 %, aperto de mão, assinatura final | No máximo **5 no filme**. São os únicos com sub-grave, cauda longa e acorde. |
| **Suporte** | Toques que confirmam uma ação visível (tap, swipe sim/não, código revelado, notificação) | Curtos, médios, sempre presos ao acorde. Um por ação, nunca empilhados. |
| **Textura** | Teclas, ticks, pops, chips, partículas | Bem baixos ou removidos. Agrupe sequências em **um gesto só**: a digitação vira uma textura contínua e discreta em vez de 33 cliques; o contador vira um riser tonal em vez de 13 ticks; os tiles do hook viram uma cascata em vez de 10 pops. |

Metas:

- **Corte de 40–60 % no número de eventos**, sem perder nenhum momento que a imagem pede.
- Nenhum trecho com mais de **4 eventos/s**, exceto gestos agrupados em uma única textura.
- **Swipe "sim" e "não" com timbres e direções reconhecíveis**. Exemplo: "sim" sobe e abre; "não" desce e fecha, com pan na direção do movimento do card. Assim o som "conta" a decisão mesmo de olhos fechados.
- **Pan seguindo a imagem**: whooshes e elementos laterais acompanham a posição na tela. Mantenha compatibilidade mono ≥ −3 dB.

### 4.4 Arco musical (mapeado ao roteiro novo)

| Bloco do roteiro | Estado da música | Notas |
|---|---|---|
| Hook — problema | Tensão leve e não resolvida: drone, pulso cardíaco, harmonia suspensa | Sem bateria. O espectador deve sentir "algo falta". |
| Ideia — lock-up | Primeira resolução + **motivo sonoro** (ver 4.5) | Não precisa ser um "drop": pode ser uma abertura de filtro e luz. |
| Experiência — swipes | Groove leve, crescendo de forma controlada | Os swipes conduzem o ritmo; a música acompanha, não compete. |
| Match 98 % | Grande momento nº 1 — ou contido, se a direção escolhida guardar o maior para o fim | Substitua o rufo de caixa acelerado por algo mais elegante, se a direção pedir. |
| Valor p/ cliente — e-mail | Respiro: e-piano filtrado, pouca percussão | Mantém o breakdown atual se funcionar. |
| **Valor p/ loja** | Firme, estável, "competente" — pulso regular, harmonia confiante | É a fala de negócio; o som transmite controle, não festa. |
| Humano — sacola e aperto de mão | Quente e orgânico: pad aberto, e-piano, **ambiente de loja** (4.6) | O som mais "humano" do filme. |
| **Assinatura** | Resolução final + motivo sonoro completo + cauda limpa até o silêncio | É a última impressão: deve ser o momento mais memorável ou o mais elegante. |

Regras de arranjo:

- **Silêncio como ferramenta:** ao menos uma pausa de 0,3–0,6 s de quase silêncio antes de um momento de assinatura.
- **Menos camadas simultâneas:** no máximo 4 vozes musicais ao mesmo tempo fora dos grandes momentos.
- Mantenha a grade de 120 BPM (a timeline depende dela). Um *feel* de meio-tempo (pulso em 60) é permitido e pode soar mais premium.
- Se o roteiro mudar a estrutura de compassos, edite `music.compose`. Não force o arranjo antigo nos tempos novos.

### 4.5 Identidade sonora (marca pessoal)

- Crie um **motivo de 3–4 notas** (o "sonic logo" do filme), derivado do acorde/escala atual. Use-o:
  - no lock-up, apresentado de forma simples;
  - no match, opcionalmente como eco discreto;
  - na **assinatura com o meu nome**, versão completa e resolvida.

  Quem assistir até o fim tem de sentir que "fechou o círculo".
- O mesmo motivo encerra o **cut-down de 15 s**.
- Documente o motivo (notas, ritmo, timbre) em `SOUND.md`, para reutilizá-lo em futuros vídeos ou posts.

### 4.6 Cenas humanas: ambiente e foley

- Adicione um **room tone de loja** sintetizado sob as fotos: ar de ambiente grande, leve murmúrio difuso sem palavras inteligíveis (ruído filtrado e modulado), talvez um eco distante. O volume deve ser baixo: sentido, não ouvido.
- Ele entra com o hand-off do tablet (abertura) e com a sacola e o aperto de mão (fechamento). Isso cria **rimas sonoras** entre o início e o fim.
- Revise o foley (`bag-rustle`, `handshake`): deve soar próximo, seco, crível. Nada brilhante ou "mágico" no aperto de mão em si; o calor vem da música.
- Faça uma transição suave de som de interface → som de mundo real quando a câmera entra e sai da tela do tablet.

### 4.7 Cut-down de 15 s

- Áudio **editado musicalmente**, não cortado: começa num downbeat, termina num acorde resolvido com o motivo sonoro e uma cauda de pelo menos 1 s até o silêncio.
- Pode ser um arranjo próprio, gerado pelo mesmo pipeline com um `cues` específico.

### 4.8 Metas técnicas (mantidas e ampliadas)

- −14 LUFS integrado (±1), true peak ≤ −1 dBTP **também depois do reencode AAC 128k**, sem clipping, compatibilidade mono ≥ −3 dB, sincronia frame a frame (`sync-measured.csv` atualizado).
- **Equilíbrio:** efeitos de suporte audíveis num alto-falante de celular, sem picos agudos agressivos. Energia acima de 8 kHz controlada e nada de "chiado" cansativo.
- **Entrada a qualquer momento:** muita gente ativa o som no meio do vídeo, então cada seção tem de soar bem "começando dali". Nada de trechos que só fazem sentido com o anterior.
- O filme continua funcionando **100 % mudo**: nenhuma informação só no áudio.

### 4.9 Escuta (você não ouve; eu ouço)

Você julga por medições e espectrogramas, então gere material para eu decidir rápido:

- `out/audio-ab/`: **A/B de 20 s** do mesmo trecho (swipes → match) nas duas direções da 4.2.
- Duas mixagens alternativas do master via `--from-stems`: música −2 dB e efeitos −3 dB.
- Um **guia de escuta de 1 página** em `SOUND.md`, com o que eu devo ouvir em: alto-falante do celular, fone (AirPods ou similar) e notebook. O guia tem perguntas objetivas: *"o swipe sim/não é distinguível de olhos fechados?"*, *"algum som irrita na 2ª vez?"*, *"o final dá sensação de conclusão?"*.
- ⛔ **Checkpoint:** espere meu feedback de escuta antes do render final.

### 4.10 Pipeline

`npm run cues` → `python tools/audio/generate.py` (com `--recalibrate` quando a estrutura mudar) → render → atualizar `audio/qa/report.md`, `closing-scenes.png` e o README do áudio.

---

## 10. Fase 5 — Entregáveis

Em `video/out/` (git-ignored) e documentados em `video/LINKEDIN.md`:

1. `suaipe-film.mp4` — master 1080×1350, 60 fps, specs atuais.
2. `suaipe-film-15s.mp4` — cut-down (nova composição em `Root.tsx`, reaproveitando cenas, com timeline própria ou derivada).
3. `suaipe-cover.png` — capa revisada: legível em miniatura, comunica o problema ou o resultado, com meu nome discreto.
4. `.srt` em inglês + idiomas da seção 3.
5. **`LINKEDIN.md` reescrito** para o objetivo de carreira:
   - Post principal em inglês (gancho na 1ª linha, história do chão de loja → solução → valor para o varejo → o que isso diz sobre como eu vendo). Sem métricas não fornecidas.
   - Versão curta do post para o cut-down de 15 s.
   - 1 linha para o CV e 1 descrição para a seção "Featured/Projects" do LinkedIn, ambas orientadas a resultado.
   - 3 perguntas que um entrevistador de vendas B2B provavelmente faria sobre o projeto, com respostas curtas e verdadeiras.
   - Checklist de publicação (capa, legendas, alt text, rótulo de conteúdo gerado por IA se ainda houver fotos de IA, autorização do empregador).
6. `video/qa/SOUND.md` — direção sonora escolhida, palavras de atmosfera, motivo sonoro documentado, guia de escuta, antes/depois da densidade de efeitos.
7. Atualize `video/README.md`, `tools/audio/README.md` e o ADR 007 se a estrutura mudou.

---

## 11. Definition of Done (verifique tudo antes de dizer que terminou)

- [ ] `npm run typecheck` sem erros; Studio abre todas as composições.
- [ ] Contact sheets a cada 0,25 s do **novo** master revisados; nenhum P0/P1 da auditoria em aberto.
- [ ] Todas as legendas passam no teste de leitura; nada essencial fora da área segura.
- [ ] Teste de continuidade de velocidade passa em todas as transições.
- [ ] Áudio regenerado e dentro das metas, inclusive após reencode AAC 128k; `audio/qa/report.md` atualizado.
- [ ] Número de efeitos reduzido conforme a 4.3; nenhum trecho acima de 4 eventos/s; no máximo 5 momentos de assinatura.
- [ ] Motivo sonoro presente no lock-up, na assinatura e no fim do cut-down de 15 s.
- [ ] Room tone e foley nas cenas humanas; meu feedback de escuta (4.9) incorporado.
- [ ] Nenhum número, nome ou marca que não esteja na seção 3.
- [ ] Os primeiros 2 s, mudos, comunicam o problema; o último frame mostra meu nome e posicionamento.
- [ ] Commits no branch, um por tema, push feito.

---

## 12. Como me reportar

- Em cada ⛔ checkpoint: resumo curto, decisões que preciso tomar, stills relevantes.
- No fim: o que mudou e por quê (máx. 10 bullets), caminhos dos arquivos finais, o que ficou de fora e qual seria o próximo passo de maior impacto.
- Se em algum momento uma instrução deste brief conflitar com a qualidade do resultado, **diga isso** e proponha a alternativa — não siga cegamente.