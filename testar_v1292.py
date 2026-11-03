#!/usr/bin/env python3
"""LivePulse V12.9.2: all historical tests + new cinema effects; no real TikTok."""
import sys,subprocess,json,time
from pathlib import Path
root=Path(__file__).resolve().parent
suites=[('Regressao historica V12.9',root/'testar_v129.py'),('Movimento cinematografico V12.9.2',root/'testar_movimento_v1292.py')]
results=[];start=time.monotonic()
for title,filename in suites:
 print('\n=== '+title+' ===',flush=True)
 try:
  r=subprocess.run([sys.executable,str(filename)],cwd=root,timeout=2100)
  passed=r.returncode==0
 except Exception as exc:
  passed=False;print('FALHOU:',repr(exc),flush=True)
 results.append({'suite':title,'passed':passed})
 print(('OK' if passed else 'FALHOU')+' | '+title,flush=True)
report={'version':'12.9.2','passed':all(r['passed'] for r in results),'groups':results,
 'seconds':round(time.monotonic()-start,2),'realLiveTested':False}
(root/'relatorio_v1292.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8')
print('RESULTADO FINAL V12.9.2:', 'SUCESSO' if report['passed'] else 'FALHA',
      f"({sum(r['passed'] for r in results)}/{len(results)} grupos)",flush=True)
sys.exit(0 if report['passed'] else 1)
