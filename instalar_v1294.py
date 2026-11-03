#!/usr/bin/env python3
"""LivePulse V12.9.4: verified installer for complete ZIP or compact update ZIP.
Finds archive by content rather than filename; makes backup and rolls back failures.
OFFLINE only. No TikTok network connection.
"""
from pathlib import Path
import os,sys,zipfile,hashlib,json,shutil,subprocess,tempfile,datetime,re,ast
ROOT=Path.home()/'livepulse'
DOWNLOADS=Path.home()/'storage/downloads'
PROTECTED=('batalha_config.json','batalha_runtime_v49.json','batalha_stats_v51.json','batalha_retencao_v53.json','batalha_seen_v53.json','batalha_comunidade_v54.json','batalha_avancado_v55.json','batalha_admin_v55.key','batalha_combate_v57.json','batalha_gift_ids.json')
def fail(msg):sys.exit('ERRO: '+str(msg))
def sha(data):return hashlib.sha256(data).hexdigest()
def inspect_syntax(code):
 with tempfile.TemporaryDirectory(prefix='lp1294_syntax_') as td:
  td=Path(td);f=td/'batalha.js';f.write_bytes(code)
  r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
  if r.returncode:fail('JavaScript servidor invalido: '+r.stderr[:500])
  m=re.search(r'<script>(.*?)</script>',code.decode(),re.S)
  if not m:fail('Script do navegador nao encontrado')
  browser=m.group(1).replace('${JSON.stringify(names)}','["Bloco"]').replace('${JSON.stringify(namesB)}','["Coroa"]').replace('${JSON.stringify(effects)}','[1]')
  b=td/'browser.js';b.write_text(browser)
  r=subprocess.run(['node','--check',str(b)],capture_output=True,text=True)
  if r.returncode:fail('JavaScript navegador invalido: '+r.stderr[:500])
if not ROOT.is_dir():fail('Pasta ~/livepulse nao existe. Instale uma versao anterior primeiro.')
if not DOWNLOADS.is_dir():fail('Downloads inacessivel. Execute termux-setup-storage.')
if not shutil.which('node'):fail('Node.js nao encontrado. Instale pkg install nodejs-lts.')
if not (ROOT/'batalha.js').is_file():fail('batalha.js ausente em ~/livepulse')
found=[]
for candidate in sorted(DOWNLOADS.glob('*.zip'),key=lambda p:p.stat().st_mtime,reverse=True):
 try:
  with zipfile.ZipFile(candidate) as z:
   names=set(z.namelist())
   if 'manifest_patch_v1294.json' in names:found.append((candidate,'manifest_patch_v1294.json','patch'))
   elif 'manifest_v1294.json' in names:found.append((candidate,'manifest_v1294.json','full'))
 except (OSError,zipfile.BadZipFile):continue
if not found:fail('Nao encontrei o pacote V12.9.4 nos Downloads (nomes alternativos sao aceitos).')
for candidate,manifest_name,kind in found:
 if kind=='patch' and not all((ROOT/f).is_file() for f in ('livepulse_visual/v129_environment.png','livepulse_visual/v129_boss_3_idle_0.png','manifest_v1293.json')):continue
 break
else:fail('Patch requer V12.9.3. Baixe o ZIP COMPLETO se a base estiver ausente.')
print('PACOTE ENCONTRADO:',candidate.name,'tipo:',kind,flush=True)
with zipfile.ZipFile(candidate) as z:
 bad=z.testzip()
 if bad:fail('ZIP corrompido: '+bad)
 manifest=json.loads(z.read(manifest_name))
 if manifest.get('version') not in ('12.9.4','12.9.4-patch'):fail('Versao do manifesto incorreta')
 files=manifest.get('files')
 if not isinstance(files,dict) or len(files)<(8 if kind=='patch' else 700):fail('Manifesto incompleto')
 names=set(z.namelist())
 for name,digest in files.items():
  if not isinstance(name,str) or name.startswith('/') or '..' in Path(name).parts or '\\' in name:fail('Caminho inseguro no arquivo: '+name)
  if name in PROTECTED:fail('Instalador nao pode sobrescrever dados privados: '+name)
  if name not in names:fail('Arquivo faltando no ZIP: '+name)
  if sha(z.read(name))!=digest:fail('SHA256 incorreto: '+name)
 for essential in ('batalha.js','economia_v1294.js','testar_v1294.py','testar_economia_v1294.py','testar_economia_v1294.js'):
  if essential not in files:fail('Pacote sem arquivo essencial: '+essential)
 inspect_syntax(z.read('batalha.js'))
 for test in ('testar_v1294.py','testar_economia_v1294.py'):
  try:ast.parse(z.read(test).decode(),filename=test)
  except SyntaxError as e:fail('Arquivo de teste invalido '+str(e))
 backup=ROOT/('backup_antes_v1294_'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
 changed=[];skipped=0
 for name,digest in files.items():
  dst=ROOT/name
  if name.startswith('batalha_assets/') and dst.exists():skipped+=1;continue
  if dst.is_file() and sha(dst.read_bytes())==digest:skipped+=1;continue
  changed.append(name)
 try:
  backup.mkdir(parents=True)
  for name in list(PROTECTED)+changed:
   old=ROOT/name
   if old.is_file():
    to=backup/name;to.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(old,to)
 except Exception as e:fail('Nao foi possivel concluir o backup; sem alteracoes: '+str(e))
 print('BACKUP CRIADO:',backup,flush=True)
 applied=[]
 try:
  for name in changed:
   dst=ROOT/name;dst.parent.mkdir(parents=True,exist_ok=True)
   pending=dst.with_name(dst.name+'.v1294.pending')
   try:
    with z.open(name) as src,pending.open('wb') as out:shutil.copyfileobj(src,out)
    os.replace(pending,dst);applied.append(name)
   finally:
    if pending.exists():pending.unlink()
 except Exception as e:
  for name in reversed(applied):
   dst=ROOT/name;old=backup/name
   try:
    if old.is_file():shutil.copy2(old,dst)
    elif dst.exists():dst.unlink()
   except Exception as x:print('ATENCAO: restauracao manual necessaria:',name,x,flush=True)
  fail('Instalacao falhou, restauracao tentada: '+str(e))
 print('SUCESSO: LivePulse V12.9.4 instalada | atualizados:',len(applied),'| inalterados:',skipped,flush=True)
 print('Dados pessoais preservados. Backup:',backup.name,flush=True)
 print('Teste OFFLINE: cd ~/livepulse && python testar_v1294.py',flush=True)
 print('Jogo OFFLINE: cd ~/livepulse && node batalha.js --demo',flush=True)
 print('Arena: http://127.0.0.1:3001/overlay?v=1294',flush=True)
