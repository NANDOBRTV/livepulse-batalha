#!/usr/bin/env python3
"""LivePulse V12.8 — bateria completa local (sem acessar TikTok real)."""
import subprocess,sys,time,json
from pathlib import Path
root=Path(__file__).resolve().parent
suites=[('Legado V12.7 — batalha, painel, TikTok simulado, desempenho e arte',root/'testar_v127.py'),('Integracao geral V12.8 — privacidade, API, persistencia e recuperacao',root/'testar_integracao_v128.py')]
results=[]
start=time.monotonic()
for title,script in suites:
 print('\n=== '+title+' ===',flush=True)
 try:
  r=subprocess.run([sys.executable,str(script)],cwd=root,timeout=2100)
  ok=r.returncode==0
  print(('OK' if ok else 'FALHOU')+' | '+title+' | codigo '+str(r.returncode),flush=True)
 except Exception as e:
  ok=False;print('FALHOU | '+title+' | '+repr(e),flush=True)
 results.append({'suite':title,'ok':ok})
report={'version':'12.8','groupsPassed':sum(x['ok'] for x in results),'groupsTotal':len(results),'elapsedSeconds':round(time.monotonic()-start,1),'allPassed':all(x['ok'] for x in results),'groups':results,'scope':'Node.js offline, sem LIVE real, sem medicao de FPS fisico no Android'}
(root/'relatorio_v128.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('\nRESULTADO FINAL V12.8: '+('SUCESSO' if report['allPassed'] else 'FALHA')+f" ({report['groupsPassed']}/{report['groupsTotal']} grupos) | {report['elapsedSeconds']}s",flush=True)
sys.exit(0 if report['allPassed'] else 1)
