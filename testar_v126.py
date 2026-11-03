#!/usr/bin/env python3
"""Full offline validation for LivePulse V12.6: inherited V12.5 + performance tests."""
from pathlib import Path
import subprocess,os,sys
root=Path(__file__).resolve().parent
suite=[('Conector, simulador, painel e batalha da V12.5',['python',str(root/'testar_v125.py')]),('Desempenho e recuperacao Android (Node simulado)',['python',str(root/'testar_performance_v126.py')])]
passed=0
for name,cmd in suite:
 print('\n=== '+name+' ===',flush=True)
 try:
  result=subprocess.run([sys.executable,*cmd[1:]],cwd=root,env=os.environ,timeout=2100)
  if result.returncode==0:passed+=1;print('OK | '+name,flush=True)
  else:print('FALHOU | '+name+' | codigo '+str(result.returncode),flush=True)
 except Exception as ex:print('FALHOU | '+name+' | '+repr(ex),flush=True)
print('RESULTADO V12.6: '+('SUCESSO' if passed==len(suite) else 'FALHA')+f' ({passed}/{len(suite)} grupos)',flush=True)
sys.exit(0 if passed==len(suite) else 1)
