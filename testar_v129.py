#!/usr/bin/env python3
"""LivePulse V12.9: regression and independent-art tests, entirely offline."""
import subprocess,sys,time,json
from pathlib import Path
root=Path(__file__).resolve().parent
suites=[('Regressao completa V12.8',root/'testar_v128.py'),('Reconstrucao artistica V12.9',root/'testar_arte_v129.py')]
results=[];start=time.monotonic()
for title,file in suites:
 print('\n=== '+title+' ===',flush=True)
 try:
  r=subprocess.run([sys.executable,str(file)],cwd=root,timeout=2400)
  ok=r.returncode==0
  print(('OK' if ok else 'FALHOU')+' | '+title+' | codigo '+str(r.returncode),flush=True)
 except Exception as err:
  ok=False;print('FALHOU | '+title+' | '+str(err),flush=True)
 results.append({'suite':title,'passed':ok})
report={'version':'12.9','groups':results,'passed':all(x['passed'] for x in results),'seconds':round(time.monotonic()-start,2),'liveReal':False}
(root/'relatorio_v129.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('RESULTADO FINAL V12.9: '+('SUCESSO' if report['passed'] else 'FALHA')+f" ({sum(x['passed'] for x in results)}/{len(results)} grupos)",flush=True)
sys.exit(0 if report['passed'] else 1)
