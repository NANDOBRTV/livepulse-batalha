#!/usr/bin/env python3
"""V12.9.3: independent premium PNG animation, local DEMO & API, no TikTok LIVE."""
from pathlib import Path
import subprocess,struct,os,socket,urllib.request,json,time,sys,tempfile,shutil,re,hashlib
ROOT=Path(__file__).resolve().parent
ART=ROOT/'livepulse_visual'
checks=[]
def check(label,cond):
 cond=bool(cond);checks.append(cond)
 print(('OK' if cond else 'FALHOU')+' | '+label,flush=True)
def png(name,w,h):
 p=ART/name
 if not p.is_file():return False
 with p.open('rb') as f:b=f.read(26)
 if len(b)<26 or b[:8]!=b'\x89PNG\r\n\x1a\n':return False
 width,height,depth,kind=struct.unpack('>IIBB',b[16:26])
 return (width,height,depth,kind)==(w,h,8,6) and p.stat().st_size>1200
for team in ('chat','creator'):
 for action in ('idle','attack','roar','hurt'):
  names=[f'v129_dragon_{team}_{action}_{n}.png' for n in range(8)]
  check('Dragao '+team+'/'+action+' · 8 RGBA transparentes',all(png(n,520,320) for n in names))
  check('Dragao '+team+'/'+action+' · quadros distintos',len({hashlib.md5((ART/n).read_bytes()).hexdigest() for n in names if (ART/n).exists()})>=6)
for phase in (1,2,3):
 for action in ('idle','attack','hurt','summon','defeat'):
  names=[f'v129_boss_{phase}_{action}_{n}.png' for n in range(8)]
  check(f'Chefe fase {phase}/{action} · 8 RGBA',all(png(n,600,440) for n in names))
for team in ('chat','creator'):
 for action in ('idle','shield','hurt','critical','destroy','rebuild'):
  names=[f'v129_tower_{team}_{action}_{n}.png' for n in range(8)]
  check('Torre '+team+'/'+action+' · 8 RGBA',all(png(n,400,470) for n in names))
check('Total 280 sprites V12.9.3',len(list(ART.glob('v129_dragon_*.png')))==64 and len(list(ART.glob('v129_boss_*.png')))==120 and len(list(ART.glob('v129_tower_*.png')))==96)
code=(ROOT/'batalha.js').read_text()
check('Motor sprite preservado',all(k in code for k in ['v126SpriteLoop','v129_dragon_','v129_boss_','v129_tower_','v1292Cinematic','v1291LayoutAudit','v1293ArtAudit']))
check('Modo economico permanece com imagens leves',all(k in code for k in ['v112_dragon_','v111_boss_','v112_tower_']))
check('Painel e simulacao TikTok preservados',all(k in code for k in ['v124dashboard','--sim-tiktok','--demo','/preflight']))
check('Sem temporizador extra V12.9.3','setInterval(v1293' not in code and 'setTimeout(v1293' not in code)
check('Node do servidor sem erros',subprocess.run(['node','--check',str(ROOT/'batalha.js')],capture_output=True).returncode==0)
script=re.search(r'<script>(.*?)</script>',code,re.S)
if script:
 browser=script.group(1).replace('${JSON.stringify(names)}','["Bloco"]').replace('${JSON.stringify(namesB)}','["Coroa"]').replace('${JSON.stringify(effects)}','[1]')
 with tempfile.TemporaryDirectory() as t:
  f=Path(t)/'script.js';f.write_text(browser)
  check('JavaScript da arena sem erros',subprocess.run(['node','--check',str(f)],capture_output=True).returncode==0)
else:check('JavaScript da arena encontrado',False)
with tempfile.TemporaryDirectory(prefix='livepulse_art1293_') as t:
 tmp=Path(t)
 with socket.socket() as sk:sk.bind(('127.0.0.1',0));port=sk.getsockname()[1]
 old="server.listen(3001,'127.0.0.1'"
 if old not in code:
  check('Servidor isolado preparado',False)
 else:
  (tmp/'batalha.js').write_text(code.replace(old,f"server.listen({port},'127.0.0.1'",1))
  for n in ('tiktok_bridge_v125.js','tiktok_sim_v125.js','economia_v1294.js'):
   if (ROOT/n).is_file():shutil.copy2(ROOT/n,tmp/n)
  for folder in ('livepulse_visual','batalha_assets'):
   os.symlink(ROOT/folder,tmp/folder,target_is_directory=True)
  env={**os.environ,'HOME':str(tmp)}
  proc=subprocess.Popen(['node','batalha.js','--demo'],cwd=tmp,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  try:
   base=f'http://127.0.0.1:{port}'
   def get(route):
    with urllib.request.urlopen(base+route,timeout=5) as r:return r.status,r.read()
   ready=False
   for _ in range(50):
    try:
     if get('/health')[0]==200:ready=True;break
    except Exception:time.sleep(.12)
   check('Servidor DEMO isolado iniciou',ready)
   if ready:
    health=json.loads(get('/health')[1]);check('Servidor reporta V12.9.3',health.get('version') in ('12.9.3','12.9.4'))
    status,html=get('/overlay');check('Arena carregada',status==200 and len(html)>50000)
    check('Auditoria premium disponivel',b'v1293ArtAudit' in html)
    for file in ('v129_dragon_chat_idle_0.png','v129_dragon_creator_attack_3.png','v129_boss_3_idle_0.png','v129_tower_creator_shield_2.png'):
     st,data=get('/visual_assets/'+file)
     check('Sprite premium servido '+file,st==200 and data.startswith(b'\x89PNG\r\n\x1a\n'))
    try:
     pf=json.loads(get('/preflight')[1]);check('Integridade funcional /preflight',pf.get('ok') is True)
    except Exception as e:check('Integridade funcional /preflight '+repr(e),False)
    initial=json.loads(get('/state')[1])['game'];time.sleep(4)
    current=json.loads(get('/state')[1])['game']
    check('DEMO entra na partida',current.get('phase')=='playing')
    check('Cronometro/pontos evoluem',any(initial.get(k)!=current.get(k) for k in ('remaining','chat','creator','round')))
  except Exception as e:check('Erro na integracao local: '+repr(e),False)
  finally:
   proc.terminate()
   try:proc.wait(timeout=3)
   except Exception:proc.kill()
report={'version':'12.9.3','passed':sum(checks),'total':len(checks),'allPassed':all(checks),'realLiveTested':False}
(ROOT/'relatorio_artes_v1293.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(f'RESULTADO ARTES V12.9.3: {sum(checks)}/{len(checks)} aprovados',flush=True)
sys.exit(0 if all(checks) else 1)
