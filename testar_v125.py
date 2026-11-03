#!/usr/bin/env python3
"""Bateria completa V12.5. Todos os testes usam dados e conectores locais."""
from pathlib import Path
import subprocess,sys,shutil
root=Path(__file__).resolve().parent
suites=[
 ('Conector TikTok sem internet (25 verificações)', ['node',str(root/'testar_tiktok_bridge_v125.js')]),
 ('Integração offline servidor/arena (18 verificações)',[sys.executable,str(root/'testar_tiktok_v125.py')]),
 ('Compatibilidade legada (12 verificações)',[sys.executable,str(root/'testar_tiktok_v121.py')]),
 ('Regressão do painel e da batalha (61 verificações)',[sys.executable,str(root/'testar_v124.py')]),
]
passed=0
for label,args in suites:
 print('\n=== '+label+' ===',flush=True)
 if not shutil.which(args[0]):print('FALHOU | Executavel ausente: '+args[0]);continue
 try:
  result=subprocess.run(args,cwd=root,timeout=180)
  if result.returncode==0:print('OK | '+label,flush=True);passed+=1
  else:print('FALHOU | '+label+' | retorno '+str(result.returncode),flush=True)
 except Exception as e:print('FALHOU | '+label+' | '+repr(e),flush=True)
print('\nRESULTADO FINAL V12.5: '+('SUCESSO' if passed==len(suites) else 'FALHA')+' ('+str(passed)+'/'+str(len(suites))+' suites)',flush=True)
sys.exit(0 if passed==len(suites) else 1)
