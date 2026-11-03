# LivePulse Batalha — Revisão de Level Design (branch `feat/level-design-p0-p2`)

**Base inspecionada:** `NANDOBRTV/livepulse-batalha` em `main`, `batalha.js` Git blob `bba4e3653ef7acb2fb724e9746d51d2d51e39797` (V12.9.4.1, economia Rosquinha ofensiva). O relatório externo avalia a V12.9.2; não é a mesma versão da branch.

## Evidência e alterações

- **P0 — Cenário:** o CSS antigo usava `background-size:100% 100%` para um PNG nativo 900 × 1450. A camada de Level Design usa `background-size: contain` com cor/gradiente de preenchimento; não deforma a textura original. O arquivo de arte não foi alterado.
- **P0 — HUD:** faixa de orientação para o espectador, líder da rodada e porcentagem relativa à meta; placares, meta, vida das torres e alvo do chefão com prioridade de sobreposição maior que efeitos decorativos. Breakpoints finais documentados para largura até 380 px e altura até 690 px; o CSS antigo permanece no arquivo para não quebrar recursos e modos legados.
- **P1 — Chefão:** `combatTelegraph` apresenta o alvo nos quatro segundos anteriores ao impacto, calculado pelo servidor. A torre atingida tem classe visual `ld-targeted`; quando cai, fica 12 s em `HP=0`, depois dispara `combatTowerRestored`. O cliente apenas representa o estado autoritativo de `/state`/SSE.
- **P1 — Pacing:** no máximo um encontro **automático** por rodada, iniciado após abertura de 25 s; invocação manual de chefe pelo painel permanece. Bônus ao time vencedor do chefão corresponde a 8% da meta, respeitando o teto configurado; não foram alterados valores de presentes nem pagamentos/conversões. Intervalos de resultado estendidos moderadamente para leitura (5,5 s normal / 7,8 s campeão). A prorrogação continua inalterada.
- **P1 — Táticas gratuitas:** usuário com equipe previamente escolhida (`!chat`/`!criador`) pode usar `!escudo` ou `!foco` durante o chefão; recargas por pessoa de 45 s e 30 s. `!foco` causa 10 HP de dano ao chefão **sem pontos de placar**. Todos os efeitos são calculados no servidor, usando a proteção de cooldown da economia.
- **P2 — Clima:** na fase 3, a classe `ld-phase3` altera suavemente a atmosfera; estado de dano, alvo e destruição das torres ativam estilos visuais condicionais. Efeitos não cobrem o guia e respeitam preferência de movimento reduzido.

## Preservação

Sem exclusão de sprites, imagens, CSS legado, APIs, painel, comandos administrativos, SSE, modos visuais, conectores TikTok ou arquivos de persistência. `batalha.js` continua executável isoladamente para os testes históricos. `level_design_v130.js` é o módulo puro documentado e testável, com as mesmas regras embutidas no motor principal (compatibilidade com a distribuição single-file histórica).

**Limitação do repositório:** os 868 PNGs e outros recursos binários da distribuição original estavam ausentes de `main` antes destas alterações. Esta branch não os apagou, mas o repositório sozinho não substitui o ZIP completo V12.9.4.1 para instalar o jogo com gráficos.

## Validação

- Sintaxe do motor Node.js e regras puras.
- `node testar_level_design_regras.js`: 12 asserts puros.
- `python testar_level_design_v130.py`: HTTP local isolado, SSE, painel, economia, telegráfica do boss e recuperação das torres, sem LIVE real; não depende de Playwright.
- Inspeção responsiva adicional com Chromium offline: 320×700, 360×780, 393×852, 430×932 e 480×960, verificando ausência de scroll horizontal, 14 posições de presentes, faixa de onboarding e cálculo CSS `contain`. Os testes visuais foram executados com DOM extraído do servidor, sem acesso do Chromium ao servidor local devido a bloqueio do ambiente, e sem métricas reais de FPS Android.
- `python testar_v12941.py`: regressão da economia e combate; também foi executada a cadeia histórica até a V12.7. A execução de toda a cadeia até a V12.9.4.1 excedeu o tempo da ferramenta e **não deve ser reportada como 100% aprovada**.

## Uso

```sh
node batalha.js --demo
python testar_level_design_v130.py
node testar_level_design_regras.js
```

**Nenhuma LIVE real foi utilizada.** O comportamento em Android físico, o mapeamento de IDs reais do TikTok e o tempo de carga da arte binária aguardam validação em aparelho.
