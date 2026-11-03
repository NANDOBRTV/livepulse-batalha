#!/usr/bin/env python3
"""LivePulse 12.3.2: validated, backed-up installation with rollback."""
from pathlib import Path
import zipfile,subprocess,shutil,datetime,sys,tempfile,json,hashlib,re,os
root=Path.home()/'livepulse'
archive=Path.home()/'storage/downloads/LivePulse_V12_3_3_Cartoes_Area_Segura.zip'
def stop(msg):sys.exit('ERRO: '+str(msg))
if not archive.is_file():stop('ZIP nao encontrado: '+str(archive))
if not root.is_dir():stop('Pasta ~/livepulse nao encontrada')
if not shutil.which('node'):stop('Node.js nao encontrado; instale com pkg install nodejs-lts')
with zipfile.ZipFile(archive) as z:
 if z.testzip():stop('Arquivo ZIP corrompido; instalacao cancelada')
 manifest=json.loads(z.read('manifest_v122.json'))
 files=manifest['files']
 if any(n.startswith('/') or '..' in Path(n).parts or '\\' in n for n in files):stop('Caminho invalido no pacote')
 if len(files)<500:stop('Pacote incompleto')
 if any(n not in z.namelist() for n in files):stop('Pacote com arquivos ausentes')
 if any(hashlib.sha256(z.read(n)).hexdigest()!=sha for n,sha in files.items()):stop('Falha de checksum; instalacao cancelada')
 with tempfile.TemporaryDirectory(prefix='livepulse_v122_') as td:
  stage=Path(td)
  for name in files:
   p=stage/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(name))
  def syntax(path):
   r=subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
   if r.returncode:stop('Sintaxe invalida em '+path.name+': '+r.stderr[:600])
  syntax(stage/'batalha.js')
  src=(stage/'batalha.js').read_text()
  m=re.search(r'<script>(.*?)</script>',src,re.S)
  if not m:stop('Script do navegador ausente')
  browser=m.group(1).replace('${JSON.stringify(names)}','["Bloco"]').replace('${JSON.stringify(namesB)}','["Coroa"]').replace('${JSON.stringify(effects)}','[1]')
  if '${' in browser:stop('Template do navegador nao resolvido')
  p=stage/'browser.js';p.write_text(browser);syntax(p)
  stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
  backup=root/('backup_antes_v1233_'+stamp)
  backup.mkdir()
  # Keep a full snapshot of existing runtime/config, plus all assets that may be overwritten.
  protected=['batalha.js','batalha_config.json','batalha_runtime_v49.json','batalha_stats_v51.json','batalha_retencao_v53.json','batalha_seen_v53.json','batalha_comunidade_v54.json','batalha_avancado_v55.json','batalha_admin_v55.key','batalha_combate_v57.json','testar_v118.py','testar_v122.py','testar_estabilidade_v122.py']
  for name in protected:
   if (root/name).is_file():shutil.copy2(root/name,backup/name)
  for folder in ('batalha_assets','livepulse_visual'):
   if (root/folder).is_dir():shutil.copytree(root/folder,backup/folder)
  print('Backup criado:',backup,flush=True)
  installed=[]
  try:
   for name in files:
    # Existing user gift icons are left untouched; existing runtime/config are never overwritten.
    if name.startswith('batalha_assets/') and (root/name).exists():continue
    dest=root/name;dest.parent.mkdir(parents=True,exist_ok=True)
    pending=dest.with_name(dest.name+'.v122.tmp')
    shutil.copy2(stage/name,pending)
    os.replace(pending,dest)
    installed.append(name)
  except Exception as exc:
   for name in reversed(installed):
    dest=root/name;old=backup/name
    try:
     if old.is_file():shutil.copy2(old,dest)
     elif dest.exists():dest.unlink()
    except Exception as rollback_exc:print('Aviso: restaure manualmente',name,rollback_exc)
   stop('Instalacao falhou; rollback tentado: '+str(exc))
  print('LivePulse V12.3.3 instalada. Execute: cd ~/livepulse && node batalha.js --demo')
  print('Testes: cd ~/livepulse && python testar_v122.py (com servidor parado)')
  print('Saude: http://127.0.0.1:3001/health')
