#!/usr/bin/env python3
"""Compatibility checks for old V12.1 test command, migrated to the V12.5 adapter.
No TikTok connection. For behavior tests, use testar_tiktok_v125.py.
"""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parent
code=(root/'batalha.js').read_text(encoding='utf8')
bridge=(root/'tiktok_bridge_v125.js').read_text(encoding='utf8')
checks={
 'comentarios encaminhados':'onChat:({user,message})' in code,
 'curtidas encaminhadas':'onLike:({user,count})' in code,
 'presentes encaminhados':'onGift:({user,name,id,count,image})' in code,
 'combos pendentes ignorados':"d.repeatEnd===false" in bridge,
 'duplicatas descartadas':'stats.duplicates++' in bridge,
 'contagem de presentes limitada':'Math.min(100,Math.trunc(raw))' in bridge,
 'URL de presente validada':'v121SafeGiftImage(image)' in code,
 'reconexao progressiva':'Math.pow(2,Math.min(attempt,10))' in bridge,
 'encerramento bloqueia reconexao':"connector.on('streamEnd'" in bridge,
 'estado da conexao no health':"tiktokDiagnostics:runtime.liveDiagnostics||null" in code,
 'seguidores e compartilhamentos':'onFollow:({user})' in code and 'onShare:({user})' in code,
 'modo offline sem LIVE':"--sim-tiktok" in code and "tiktok_sim_v125" in code,
}
for label,ok in checks.items():print(('OK' if ok else 'FALHOU')+' | '+label,flush=True)
print('RESULTADO: %d/%d verificacoes estaticas de compatibilidade'%(sum(checks.values()),len(checks)),flush=True)
sys.exit(0 if all(checks.values()) else 1)
