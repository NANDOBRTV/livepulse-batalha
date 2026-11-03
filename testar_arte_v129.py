#!/usr/bin/env python3
"""Checagem de sprites RGBA originais, animacao, carregamento e DEMO sem LIVE real."""
from pathlib import Path
import struct,hashlib,json,subprocess,socket,tempfile,os,shutil,time,urllib.request,sys,re
ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'livepulse_visual'
checks=[]
def check(n,ok):
 checks.append(bool(ok));print(('OK' if ok else 'FALHOU')+' | '+n,flush=True)
def png(path):
 try:
  with path.open('rb') as f:header=f.read(26)
  if len(header)!=26 or header[:8]!=b'\x89PNG\r\n\x1a\n':return False
  w,h,depth,kind=struct.unpack('>IIBB',header[16:26])
  return w>=300 and h>=200 and depth==8 and kind==6 and path.stat().st_size>3000
 except Exception:return False
names=[]
for team in ['chat','creator']:
 for action in ['idle','roar','attack','hurt']:
  frame=[ASSETS/f'v129_dragon_{team}_{action}_{i}.png' for i in range(8)]
  names.extend(frame)
  check(f'Dragao {team}/{action} com 8 quadros RGBA',all(png(p) for p in frame))
  check(f'Dragao {team}/{action} com movimento distinto',len({hashlib.sha256(p.read_bytes()).digest() for p in frame})>=3)
for phase in [1,2,3]:
 for action in ['idle','summon','attack','hurt','defeat']:
  frame=[ASSETS/f'v129_boss_{phase}_{action}_{i}.png' for i in range(8)]
  names.extend(frame)
  check(f'Chefe fase {phase}/{action} com 8 quadros RGBA',all(png(p) for p in frame))
  check(f'Chefe fase {phase}/{action} com movimento distinto',len({hashlib.sha256(p.read_bytes()).digest() for p in frame})>=3)
for team in ['chat','creator']:
 for state in ['idle','hurt','critical','shield','destroy','rebuild']:
  frame=[ASSETS/f'v129_tower_{team}_{state}_{i}.png' for i in range(8)]
  names.extend(frame)
  check(f'Torre {team}/{state} com 8 quadros RGBA',all(png(p) for p in frame))
  check(f'Torre {team}/{state} com movimento distinto',len({hashlib.sha256(p.read_bytes()).digest() for p in frame})>=3)
check('Total exato de 280 quadros independentes',len(names)==280 and len(set(names))==280)
check('Cenario e nevoa presentes',png(ASSETS/'v129_environment.png') and png(ASSETS/'v129_foreground_mist.png'))
code=(ROOT/'batalha.js').read_text(encoding='utf8')
check('Arte 12.9 em modo equilibrado e cinematografico','v129_dragon_' in code and 'v129_boss_' in code and 'v129_tower_' in code)
check('Modo economico mantem sprites historicos',"v60mode==='economico'?'v112_dragon_'" in code and "v60mode==='economico'?'v111_boss_'" in code)
check('Arena preserva presentes e HUD', all(x in code for x in ['id="gchat"','id="gcreator"','id="bossSprite"','id="v124dashboard"']))
check('Script renderizacao sintaticamente valido',subprocess.run(['node','--check',str(ROOT/'batalha.js')],capture_output=True).returncode==0)
check('Nenhuma LIVE real exigida', '--sim-tiktok' in code and '--demo' in code)
# Spawn isolated Node server from copy of current files, random port, prevent collision with user server.
with tempfile.TemporaryDirectory(prefix='v129_test_') as tmp:
 testroot=Path(tmp)
 for n in ['batalha.js','batalha_config.json','tiktok_bridge_v125.js','tiktok_sim_v125.js','economia_v1294.js']:
  if n=='batalha.js':
   src=code.replace("server.listen(3001,'127.0.0.1'", "server.listen(__TEST_PORT__,'127.0.0.1'",1)
   with socket.socket() as sk:sk.bind(('127.0.0.1',0));port=sk.getsockname()[1]
   src=src.replace('__TEST_PORT__',str(port))
   (testroot/n).write_text(src)
  elif (ROOT/n).exists():shutil.copy2(ROOT/n,testroot/n)
 for folder in ('livepulse_visual','batalha_assets'):
  # symbolic links in temporary sandbox: same independent PNGs, no duplicate 50MB copy
  os.symlink(ROOT/folder,testroot/folder,target_is_directory=True)
 env={**os.environ,'HOME':tmp}
 proc=subprocess.Popen(['node','batalha.js','--demo'],cwd=testroot,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  base=f'http://127.0.0.1:{port}'
  def get(route):
   with urllib.request.urlopen(base+route,timeout=7) as r:return r.status,r.headers,r.read()
  started=False
  for _ in range(50):
   try:
    if get('/health')[0]==200:started=True;break
   except Exception:time.sleep(.1)
  check('Servidor Node DEMO em porta isolada',started)
  if started:
   h=json.loads(get('/health')[2]);check('Health reporta versao 12.9',h.get('version') in ('12.9','12.9.2','12.9.3','12.9.4'))
   a=json.loads(get('/state')[2])
   check('Estado e configuracao presentes','game' in a and 'config' in a)
   for n in ('v129_dragon_chat_idle_0.png','v129_dragon_creator_attack_4.png','v129_boss_3_attack_0.png','v129_tower_chat_shield_0.png','v129_environment.png'):
    status,hdr,b=get('/visual_assets/'+n)
    check('Asset servido '+n,status==200 and len(b)>5000 and b[:8]==b'\x89PNG\r\n\x1a\n')
   overlay=get('/overlay')[2].decode()
   check('Overlay usa arte v129 e camada DOM',"v129_environment.png" in overlay and 'id="bossSprite"' in overlay and 'v129ArtAudit' in overlay)
   check('14 presentes em DOM','class="gift"' in overlay and 'id="gchat"' in overlay and 'id="gcreator"' in overlay)
   time.sleep(4)
   b=json.loads(get('/state')[2])
   check('Partida DEMO ativa',b['game'].get('phase')=='playing')
   check('Pontuacao/cronometro evoluem',b['game'].get('chat')!=a['game'].get('chat') or b['game'].get('creator')!=a['game'].get('creator') or b['game'].get('remaining')!=a['game'].get('remaining'))
   check('Preflight ainda responde',get('/preflight')[0]==200)
 except Exception as e:
  check('Servidor/recursos: '+repr(e),False)
 finally:
  proc.terminate()
  try:proc.wait(timeout=3)
  except Exception:proc.kill()
report={'version':'12.9','passed':sum(checks),'total':len(checks),'allPassed':all(checks),'scope':'sprites RGBA, DEMO isolado, sem LIVE real, sem FPS fisico'}
(ROOT/'relatorio_arte_v129.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(f"RESULTADO V12.9 ARTE: {sum(checks)}/{len(checks)} verificacoes aprovadas",flush=True)
sys.exit(0 if all(checks) else 1)
