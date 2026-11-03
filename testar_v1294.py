#!/usr/bin/env python3
"""LivePulse V12.9.4: full inherited offline regressions and economy tests."""
from pathlib import Path
import subprocess,sys,json,time
root=Path(__file__).resolve().parent
suites=[('Legado V12.9.3',root/'testar_v1293.py'),('Economia V12.9.4',root/'testar_economia_v1294.py')]
results=[]
for title,p in suites:
 print('\n=== '+title+' ===',flush=True)
 start=time.monotonic()
 try:
  rc=subprocess.run([sys.executable,str(p)],cwd=root,timeout=2400).returncode
 except Exception as e:
  rc=1;print('ERRO:',repr(e),flush=True)
 ok=rc==0;results.append({'suite':title,'success':ok,'seconds':round(time.monotonic()-start,1)})
 print(('OK' if ok else 'FALHOU')+' | '+title,flush=True)
report={'version':'12.9.4','realLiveTested':False,'success':all(x['success'] for x in results),'groups':results}
(root/'relatorio_v1294.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print('RESULTADO FINAL V12.9.4: '+('SUCESSO' if report['success'] else 'FALHA')+f" ({sum(x['success'] for x in results)}/{len(results)} grupos)",flush=True)
sys.exit(0 if report['success'] else 1)
