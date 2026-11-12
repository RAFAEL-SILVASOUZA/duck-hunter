# Duck Hunt JS

Uma recriacao do classico **Duck Hunt** (NES) feita em **HTML5 Canvas + JavaScript puro**, sem dependencias externas. Todo o conteudo do jogo (sprites, fonte, sons) e gerado por codigo em tempo de execucao: nao ha uma unica imagem ou arquivo de audio no projeto.

Funciona em **computador** e **celular** (em horizontal), com controle por mouse e por toque, e se adapta a qualquer tamanho de tela.

## Como jogar

Abra o `index.html` em qualquer navegador moderno (duplo clique ja basta). Nao precisa de servidor nem de internet.

| Acao | Computador | Celular |
|------|-----------|---------|
| Mirar | mover o mouse | arrastar o dedo |
| Atirar | clique ou `Espaco` | tocar na tela ou no botao FIRE |
| Pausar | `P` ou botao | botao de pausa |
| Tela cheia | `F` ou botao | botao de tela cheia |
| Som on/off | `M` ou botao | botao de som |

### Regras (fiel ao original)

- Voce tem **3 tiros** por rodada e **3 patos** por rodada (2 nas duas primeiras).
- Cada pato que foge custa uma **vida**; se algum pato escapar, voce nao passa de rodada.
- Acertar **todos** os patos de uma rodada da **bonus** de pontos.
- A cada **10.000 pontos** voce ganha uma vida extra (1 UP).
- O **cachorro** aparece para farejar, rir quando um pato escapa, e exibir os patos abatidos quando voce acerta tudo.
- Cada rodada vencida aumenta a velocidade e a inteligencia dos patos.
- O recorde (HI-SCORE) fica salvo no navegador.

## Estrutura

```
index.html          pagina, layout responsivo e tela cheia
css (embutido)      responsividade, safe-area, botao FIRE, aviso de girar
js/
  util.js           matematica, colisao e RNG deterministico
  pixel.js          "pincel" pixel art, fonte bitmap 3x5, cache de sprites
  sprites.js        patos (4 cores + dourado), cachorro (5 poses), cenario, mira
  audio.js          todos os sons sintetizados via Web Audio API
  entities.js       Duck (IA de voo), Bullet, Feather, Dog (maquina de estados)
  game.js           game loop com timestep fixo, fases, pontuacao, HUD
  main.js           entrada unificada (mouse/toque), escala, fullscreen, wake lock
tests/
  smoke.js          teste de runtime sem navegador (mock de canvas/DOM)
```

## Tecnicas usadas

- **Pixel art procedural**: sprites desenhados pixel a pixel em canvases offscreen e memorizados por chave (cache). Nada de assets.
- **Render nitido**: o mundo e desenhado numa resolucao interna de 320x240 e escalado com `imageSmoothingEnabled = false` + `image-rendering: pixelated`, mantendo proporcao 4:3 com letterbox em qualquer tela.
- **Timestep fixo** com acumulador (fisica a 120 Hz) para o jogo rodar igual em 60, 90 ou 120 Hz.
- **IA do pato estilo NES**: entra pela lateral, sobe ate uma altura-alvo, faz "zig-zag" vertical, muda de direcao nas bordas e foge pelo lado apos um tempo limite.
- **Audio sintetizado**: tiros (ruido + sweep), quack, queda, risada do cachorro e jingles feitos so com osciladores e buffers de ruido.
- **Responsividade mobile**: `viewport` travado, `touch-action: none`, `100dvh`, `aspect-ratio`, botao de tiro no polegar, fullscreen com wake lock (tela nao apaga), vibração ao atirar e aviso "gire o celular" no retrato.
- **Teste de runtime headless** (`tests/smoke.js`): roda milhares de frames simulando partida completa com um mock de canvas para pegar erros.

## Teste

```bash
node tests/smoke.js
```

Rodou cerca de 4000 frames de partida simulada sem erros de execucao.

## Limitacao de audio

Por politica de navegadores, o som so e liberado apos o primeiro toque/clique (ja tratado no codigo). No primeiro toque, o audio e destravado.

---

Feito com HTML, CSS e JavaScript. Nao usa bibliotecas nem imagens externas.
