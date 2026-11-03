#!/usr/bin/env python3
"""V12.9.4.1 — Rosquinha debita apenas o adversario; offline."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parent
suites=[('Economia e placares', ['python','testar_economia_v1294.py']),
        ('Regressao de batalha', ['python','testar_v122.py'])]
failed=0
for name,cmd in suites:
 print('===',name,'===',flush=True)
 r=subprocess.run([sys.executable,*cmd[1:]],cwd=root)
 print(name,'OK' if r.returncode==0 else 'FALHOU',flush=True)
 failed+=int(r.returncode!=0)
print('RESULTADO V12.9.4.1:', 'SUCESSO' if not failed else 'FALHA',flush=True)
sys.exit(1 if failed else 0)
