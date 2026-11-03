#!/usr/bin/env python3
"""LivePulse V12.9.2: validated local install with backup + rollback, offline."""
from pathlib import Path
import zipfile,subprocess,shutil,datetime,sys,tempfile,json,hashlib,re,os,urllib.request,ast
ROOT=Path.home()/'livepulse'
ARCHIVE=Path.home()/'storage/downloads/LivePulse_V12_9_2.zip'
PROTECTED=['batalha_config.json','batalha_runtime_v49.json','batalha_stats_v51.json',
 'batalha_retencao_v53.json','batalha_seen_v53.json','batalha_comunidade_v54.json',
 'batalha_avancado_v55.json','batalha_admin_v55.key','batalha_combate_v57.json']
def fail(message):sys.exit('ERRO: '+str(message))
def checksum(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def syntax(file):
 p=subprocess.run(['node','--check',str(file)],capture_output=True,text=True)
 if p.returncode:fail('Falha de sintaxe Node.js em '+file.name+': '+p.stderr[:600])
if not ARCHIVE.is_file():fail('Baixe o ZIP para Downloads: '+str(ARCHIVE))
if not ROOT.is_dir():fail('Pasta ~/livepulse nao encontrada; instale primeiro sua LivePulse')
if not shutil.which('node'):fail('Instale Node.js no Termux: pkg install nodejs-lts')
try:
 with urllib.request.urlopen('http://127.0.0.1:3001/health',timeout=.3):
  print('ATENCAO: servidor LivePulse parece estar aberto. Pare-o com Ctrl+C e reinicie depois da instalacao.',flush=True)
except Exception:pass
with zipfile.ZipFile(ARCHIVE) as z:
 bad=z.testzip()
 if bad:fail('ZIP corrompido: '+bad)
 manifest=json.loads(z.read('manifest_v1292.json'))
 if manifest.get('version')!='12.9.2':fail('Manifesto incorreto')
 files=manifest.get('files')
 if not isinstance(files,dict) or len(files)<900:fail('Pacote incompleto')
 if any(not isinstance(name,str) or name.startswith('/') or '..' in Path(name).parts or '\\' in name for name in files):fail('Caminho inseguro no pacote')
 if any(name not in z.namelist() for name in files):fail('Arquivo obrigatorio ausente')
 if any(x in files for x in PROTECTED):fail('Pacote tentou substituir arquivos pessoais')
 for name,sha in files.items():
  if hashlib.sha256(z.read(name)).hexdigest()!=sha:fail('Integridade SHA256 falhou: '+name)
 with tempfile.TemporaryDirectory(prefix='livepulse_v1292_check_') as temporary:
  stage=Path(temporary)
  for name in ('batalha.js','tiktok_bridge_v125.js','tiktok_sim_v125.js','testar_v1292.py','testar_movimento_v1292.py'):
   path=stage/name;path.write_bytes(z.read(name))
  for name in ('batalha.js','tiktok_bridge_v125.js','tiktok_sim_v125.js'):syntax(stage/name)
  for name in ('testar_v1292.py','testar_movimento_v1292.py'):
   try:ast.parse((stage/name).read_text(),filename=name)
   except SyntaxError as e:fail('Teste Python invalido: '+str(e))
  client=re.search(r'<script>(.*?)</script>',(stage/'batalha.js').read_text(),re.S)
  if not client:fail('Overlay sem JavaScript')
  source=client.group(1).replace('${JSON.stringify(names)}','["Bloco"]').replace('${JSON.stringify(namesB)}','["Coroa"]').replace('${JSON.stringify(effects)}','[1]')
  if '${' in source:fail('JavaScript do navegador nao resolvido')
  browser=stage/'navegador.js';browser.write_text(source);syntax(browser)
 stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
 backup=ROOT/('backup_antes_v1292_'+stamp)
 backup.mkdir()
 changed=[];skipped=0
 # Never replace user custom icons even if the package contains the original gifts.
 for name,digest in files.items():
  destination=ROOT/name
  if name.startswith('batalha_assets/') and destination.exists():
   skipped+=1;continue
  if destination.is_file() and checksum(destination)==digest:
   skipped+=1;continue
  changed.append(name)
 try:
  for name in PROTECTED:
   original=ROOT/name
   if original.is_file():
    copy=backup/name;copy.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original,copy)
  for name in changed:
   original=ROOT/name
   if original.is_file():
    copy=backup/name;copy.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original,copy)
 except Exception as e:fail('Nao foi possivel criar o backup; nenhuma alteracao aplicada: '+str(e))
 print('Backup criado:',backup,flush=True)
 applied=[]
 try:
  for name in changed:
   destination=ROOT/name;destination.parent.mkdir(parents=True,exist_ok=True)
   pending=destination.with_name(destination.name+'.v1292.tmp')
   try:
    with z.open(name) as source,pending.open('wb') as target:shutil.copyfileobj(source,target)
    os.replace(pending,destination)
    applied.append(name)
   finally:
    if pending.exists():pending.unlink()
 except Exception as e:
  for name in reversed(applied):
   old=backup/name;dst=ROOT/name
   try:
    if old.is_file():shutil.copy2(old,dst)
    elif dst.exists():dst.unlink()
   except Exception as er:print('ATENCAO: restaure manualmente '+name+': '+str(er),flush=True)
  fail('Instalacao falhou; restauracao tentada: '+str(e))
 print('LivePulse V12.9.2 instalada | atualizados:',len(applied),'| preservados:',skipped,flush=True)
 print('Dados e chave admin preservados; backup:',backup.name,flush=True)
 print('Iniciar OFFLINE: cd ~/livepulse && node batalha.js --demo',flush=True)
 print('Arena: http://127.0.0.1:3001/overlay?v=1292',flush=True)
 print('Painel: http://127.0.0.1:3001/painel?v=1292',flush=True)
 print('Testes (com servidor parado): cd ~/livepulse && python testar_v1292.py',flush=True)
