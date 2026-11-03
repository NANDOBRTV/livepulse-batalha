#!/usr/bin/env python3
"""LivePulse V12.9.2: cinematic assets & event processing checks, fully offline."""
from pathlib import Path
import json,struct,subprocess,sys,re,os,time,tempfile,shutil,socket,urllib.request
ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'livepulse_visual'
checks=[]
def check(label,yes):
 yes=bool(yes);checks.append(yes)
 print(('OK' if yes else 'FALHOU')+' | '+label,flush=True)
def png(name):
 p=ASSETS/name
 if not p.is_file():return False
 with p.open('rb') as f:h=f.read(26)
 if len(h)<26 or h[:8]!=b'\x89PNG\r\n\x1a\n':return False
 w,h,depth,mode=struct.unpack('>IIBB',h[16:26])
 return w>=384 and h>=240 and depth==8 and mode==6 and p.stat().st_size>=1000
code=(ROOT/'batalha.js').read_text(encoding='utf8')
for p in (1,2,3):
 for side in ('left','right'):
  check(f'Asa {side} fase {p} · camada PNG transparente',png(f'v1292_boss_wing_{p}_{side}.png'))
 check(f'Selo de transicao da fase {p}',png(f'v1292_phase_{p}.png'))
for team in ('chat','creator'):
 check('Ataque da equipe '+team,png('v1292_attack_'+team+'.png'))
 check('Fragmentos da torre '+team,png('v1292_debris_'+team+'.png'))
check('Selo de vitoria',png('v1292_victory_ring.png'))
check('Total dos 14 recursos independentes',len(list(ASSETS.glob('v1292_*.png')))==14)
for tag in ('v1292WingRig','v1292WingLeft','v1292WingRight','v1292Portal','v1292AttackFx'):
 check('Camada de renderizacao '+tag,('id="'+tag+'"') in code)
for action in ('attack','towerdown','victory'):
 check('Reacao real ao evento '+action,('type===\''+action+'\'') in code and 'v1292Cinematic(type,data)' in code)
check('Transicao de fase ligada ao chefao','v1292StageTransition(n);sprite.src=' in code)
check('Sem loops adicionais de efeitos',code.count('setTimeout(v126SpriteLoop,140);')==1 and 'setInterval(v1292' not in code)
check('Modo Economico preservado','v60-economico .arena .field #v1292WingRig' in code)
check('Movimento reduzido respeitado','prefers-reduced-motion:reduce' in code)
check('Base V12.9 preservada',all(x in code for x in ('v129_dragon_','v129_boss_','v129_tower_','--sim-tiktok','--demo','id="v124dashboard"','id="gchat"','id="gcreator"')))
check('Modo Android V12.9.1 preservado','v1291LayoutAudit' in code)
check('Auditoria de movimento V12.9.2','window.v1292MotionAudit=' in code)
check('Node.js sem erros',subprocess.run(['node','--check',str(ROOT/'batalha.js')],capture_output=True).returncode==0)
script=re.search(r'<script>(.*?)</script>',code,re.S)
if script:
 sc=script.group(1).replace('${JSON.stringify(names)}','["Bloco"]').replace('${JSON.stringify(namesB)}','["Coroa"]').replace('${JSON.stringify(effects)}','[1]')
 with tempfile.TemporaryDirectory() as t:
  p=Path(t)/'browser.js';p.write_text(sc)
  check('Browser JS sem erros',subprocess.run(['node','--check',str(p)],capture_output=True).returncode==0)
else:check('Browser JS encontrado',False)
# Run a real isolated Node demo; do not connect to TikTok servers.
with tempfile.TemporaryDirectory(prefix='livepulse_v1292_') as td:
 tmp=Path(td);temp_code=code
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 old="server.listen(3001,'127.0.0.1'"
 assert old in temp_code,'Porta de teste precisa ser isolada'
 temp_code=temp_code.replace(old,f"server.listen({port},'127.0.0.1'",1)
 (tmp/'batalha.js').write_text(temp_code)
 for n in ('tiktok_bridge_v125.js','tiktok_sim_v125.js','economia_v1294.js'):
  if (ROOT/n).is_file():shutil.copy2(ROOT/n,tmp/n)
 for folder in ('livepulse_visual','batalha_assets'):
  os.symlink(ROOT/folder,tmp/folder,target_is_directory=True)
 env={**os.environ,'HOME':str(tmp)}
 proc=subprocess.Popen(['node','batalha.js','--demo'],cwd=tmp,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  base=f'http://127.0.0.1:{port}'
  def get(route):
   with urllib.request.urlopen(base+route,timeout=6) as response:
    return response.status,response.headers,response.read()
  started=False
  for _ in range(70):
   try:
    if get('/health')[0]==200:started=True;break
   except Exception:time.sleep(.1)
  check('Servidor DEMO offline inicia',started)
  if started:
   health=json.loads(get('/health')[2])
   check('Release reporta 12.9.2+',health.get('version') in ('12.9.2','12.9.3','12.9.4'))
   status,_,markup=get('/overlay')
   check('Overlay completo HTTP 200',status==200 and len(markup)>50000)
   check('Overlay contem efeitos e sprites independentes',b'v1292WingRig' in markup and b'v1292AttackFx' in markup and b'v1292MotionAudit' in markup)
   for file in ['v1292_boss_wing_3_left.png','v1292_boss_wing_3_right.png','v1292_phase_2.png','v1292_attack_chat.png','v1292_debris_creator.png']:
    st,headers,data=get('/visual_assets/'+file)
    check('PNG disponivel via HTTP '+file,st==200 and data[:8]==b'\x89PNG\r\n\x1a\n')
   first=json.loads(get('/state')[2])['game']
   time.sleep(4)
   second=json.loads(get('/state')[2])['game']
   check('DEMO segue jogavel',second.get('phase')=='playing')
   check('Pontuacao ou cronometro evoluem',any(first.get(k)!=second.get(k) for k in ('remaining','chat','creator','round')))
   check('Integridade continua acessivel',get('/preflight')[0]==200)
 except Exception as err:
  check('Falha inesperada na simulacao: '+repr(err),False)
 finally:
  proc.terminate()
  try:proc.wait(timeout=4)
  except Exception:proc.kill()
report={'version':'12.9.2','passed':sum(checks),'total':len(checks),'allPassed':all(checks),'scope':'offline Node DEMO; PNGs independentes; sintaxe; rotas; regras preservadas; sem LIVE real'}
(ROOT/'relatorio_movimento_v1292.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('RESULTADO MOVIMENTO V12.9.2: %d/%d aprovados'%(sum(checks),len(checks)),flush=True)
sys.exit(0 if all(checks) else 1)
