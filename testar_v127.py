#!/usr/bin/env python3
"""V12.7: inherited 144 tests + independent cinematic assets/HTTP suite. OFFLINE."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parent
suites=[('Regressao V12.6 (batalha, TikTok simulado, Android)', ['python',str(root/'testar_v126.py')]),('Camadas cinematograficas independentes V12.7',['python',str(root/'testar_visual_v127.py')])]
passed=0
for label,cmd in suites:
 print('\n=== '+label+' ===',flush=True)
 r=subprocess.run(cmd,cwd=root)
 if r.returncode==0:passed+=1;print('OK | '+label,flush=True)
 else:print('FALHOU | '+label+' | codigo '+str(r.returncode),flush=True)
print('\nRESULTADO FINAL V12.7: '+('SUCESSO' if passed==len(suites) else 'FALHA')+f' ({passed}/{len(suites)} grupos)',flush=True)
sys.exit(0 if passed==len(suites) else 1)
