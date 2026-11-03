# LivePulse Batalha — V12.9.4.1

Jogo de batalha interativa com overlay para TikTok LIVE. Esta distribuição inclui o motor Node.js, os recursos gráficos independentes, o painel de controle, as simulações offline e os testes.

## Executar no Termux

```sh
cd ~/livepulse
node batalha.js --demo
```

Arena: http://127.0.0.1:3001/overlay
Painel: http://127.0.0.1:3001/painel
Preflight: http://127.0.0.1:3001/preflight

## Testes offline

Com o servidor parado:

```sh
python testar_v12941.py
```

## Segurança e dados locais

A chave administrativa é gerada no arquivo `batalha_admin_v55.key` na primeira execução e **não deve ser publicada**. Configurações, estados de partidas, backups e arquivos `.env` também ficam fora do controle de versão. Evite abrir portas do servidor diretamente para a internet.

## TikTok

O modo `--demo` funciona sem LIVE real. A integração real depende de validação separada, biblioteca apropriada e permissões; não foi validada em uma transmissão.

## Regras importantes

A Rosquinha retira 20 pontos do time adversário, sem prejudicar o próprio time. Os limites de combo e de pontuação foram revisados na V12.9.4.1.