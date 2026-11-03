#!/usr/bin/env python3
"""LivePulse 12.9.3 offline: regressions + premium-art integration."""
from pathlib import Path
import subprocess,sys,json,time
root=Path(__file__).resolve().parent
suites=[('V12.9.2 legado',root/'testar_v1292.py'),('V12.9.3 artes premium',root/'testar_artes_v1293.py')]
results=[]
for name,path in suites:
 print('\n=== '+name+' ===',flush=True)
 try:
  rc=subprocess.run([sys.executable,str(path)],cwd=root,timeout=2400).returncode
 except Exception as e:
  print('ERRO',repr(e),flush=True);rc=1
 results.append({'suite':name,'passed':rc==0});print(('OK' if rc==0 else 'FALHOU')+' | '+name,flush=True)
passed=all(a['passed'] for a in results)
(root/'relatorio_v1293.json').write_text(json.dumps({'version':'12.9.3','success':passed,'groups':results,'realLiveTested':False},indent=2))
print(f'RESULTADO FINAL V12.9.3: {"SUCESSO" if passed else "FALHA"} ({sum(x["passed"] for x in results)}/{len(results)} grupos)',flush=True)
sys.exit(0 if passed else 1)
