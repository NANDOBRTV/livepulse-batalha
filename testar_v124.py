#!/usr/bin/env python3
"""Execute a regressão original e os testes novos do painel V12.4.
Pare qualquer LivePulse em execução antes de iniciar este script.
"""
import subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parent
checks=[('Painel V12.4',root/'testar_painel_v124.py'),('Regressao de batalha',root/'testar_v122.py')]
failed=0
for label,test in checks:
 print('\n=== '+label+' ===',flush=True)
 try:
  r=subprocess.run([sys.executable,str(test)],cwd=root,timeout=160)
  if r.returncode:failed+=1;print('FALHOU | '+label+' | codigo '+str(r.returncode),flush=True)
  else:print('OK | '+label,flush=True)
 except Exception as e:failed+=1;print('FALHOU | '+label+' | '+repr(e),flush=True)
print('\nRESULTADO FINAL: '+('SUCESSO' if failed==0 else 'FALHA')+' ('+str(len(checks)-failed)+'/'+str(len(checks))+' grupos)',flush=True)
sys.exit(0 if failed==0 else 1)
