#!/usr/bin/env python3
"""LivePulse V12.6 — instalacao segura, checagem SHA256 e backup reversivel."""
from pathlib import Path
import zipfile,subprocess,shutil,datetime,sys,tempfile,json,hashlib,re,os
root=Path.home()/'livepulse'
archive=Path.home()/'storage/downloads/LivePulse_V12_6_Otimizacao_Android.zip'
def stop(message):sys.exit('ERRO: '+str(message))
if not archive.is_file():stop('ZIP nao encontrado em '+str(archive))
if not root.is_dir():stop('Pasta ~/livepulse nao encontrada')
if not shutil.which('node'):stop('Node.js nao encontrado. Instale usando pkg install nodejs-lts')
with zipfile.ZipFile(archive) as z:
 bad=z.testzip()
 if bad:stop('Pacote ZIP corrompido: '+bad)
 manifest=json.loads(z.read('manifest_v126.json'))
 if manifest.get('version')!='12.6':stop('Manifesto incorreto')
 files=manifest['files']
 if len(files)<500:stop('Pacote incompleto')
 if any(not isinstance(n,str) or n.startswith('/') or '..' in Path(n).parts or '\\' in n for n in files):stop('Caminho inseguro no manifesto')
 if any(n not in z.namelist() for n in files):stop('Faltam arquivos do manifesto')
 protected=['batalha_config.json','batalha_runtime_v49.json','batalha_stats_v51.json','batalha_retencao_v53.json','batalha_seen_v53.json','batalha_comunidade_v54.json','batalha_avancado_v55.json','batalha_admin_v55.key','batalha_combate_v57.json']
 if any(x in files for x in protected):stop('Pacote nao pode substituir dados pessoais/configuracoes')
 for name,sha in files.items():
  if hashlib.sha256(z.read(name)).hexdigest()!=sha:stop('Falha SHA256 em '+name)
 with tempfile.TemporaryDirectory(prefix='livepulse_v126_') as td:
  stage=Path(td)
  for name in files:
   dest=stage/name
   dest.parent.mkdir(parents=True,exist_ok=True)
   dest.write_bytes(z.read(name))
  def syntax(path):
   r=subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
   if r.returncode:stop('JavaScript invalido em '+path.name+': '+r.stderr[:700])
  syntax(stage/'batalha.js')
  syntax(stage/'tiktok_bridge_v125.js')
  syntax(stage/'tiktok_sim_v125.js')
  syntax(stage/'testar_tiktok_bridge_v125.js')
  code=(stage/'batalha.js').read_text(encoding='utf8')
  m=re.search(r'<script>(.*?)</script>',code,re.S)
  if not m:stop('Navegador: script ausente')
  script=m.group(1).replace('${JSON.stringify(names)}','["Bloco"]').replace('${JSON.stringify(namesB)}','["Coroa"]').replace('${JSON.stringify(effects)}','[1]')
  if '${' in script:stop('Navegador: variaveis nao resolvidas')
  (stage/'v126_browser_check.js').write_text(script)
  syntax(stage/'v126_browser_check.js')
  stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
  backup=root/('backup_antes_v126_'+stamp)
  backup.mkdir()
  # Preserva estados e configuracoes. Copia todas as artes, inclusive artes customizadas.
  try:
   for name in protected:
    if (root/name).is_file():
     dest=backup/name;dest.parent.mkdir(parents=True,exist_ok=True)
     shutil.copy2(root/name,dest)
   for folder in ('batalha_assets','livepulse_visual'):
    if (root/folder).is_dir():shutil.copytree(root/folder,backup/folder)
   # Cada arquivo que pode ser sobrescrito tem copia de seguranca.
   for name in files:
    old=root/name
    if old.is_file():
     dst=backup/name
     if not dst.exists():dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(old,dst)
  except Exception as e:
   stop('Backup nao foi concluido; nenhum arquivo instalado. '+str(e))
  print('Backup criado:',backup,flush=True)
  installed=[]
  try:
   for name in files:
    dest=root/name
    # Preserva icones personalizados existentes.
    if name.startswith('batalha_assets/') and dest.exists():continue
    dest.parent.mkdir(parents=True,exist_ok=True)
    pending=dest.with_name(dest.name+'.v126-pendente')
    try:
     shutil.copy2(stage/name,pending)
     os.replace(pending,dest)
     installed.append(name)
    finally:
     if pending.exists():pending.unlink()
  except Exception as e:
   for name in reversed(installed):
    dest=root/name;old=backup/name
    try:
     if old.is_file():shutil.copy2(old,dest)
     elif dest.exists():dest.unlink()
    except Exception as restore_err:print('ATENCAO: restaure manualmente:',name,restore_err,flush=True)
   stop('Falha na instalacao; rollback tentado: '+str(e))
  print('LivePulse V12.6 instalada. Configuracoes e chave administrativa preservadas.',flush=True)
  print('Painel: http://127.0.0.1:3001/painel',flush=True)
  print('Arena: http://127.0.0.1:3001/overlay',flush=True)
  print('Simulacao TikTok OFFLINE: cd ~/livepulse && node batalha.js --sim-tiktok',flush=True)
  print('DEMO original: cd ~/livepulse && node batalha.js --demo',flush=True)
  print('Testar (sem LIVE real): cd ~/livepulse && python testar_v126.py',flush=True)
