#!/usr/bin/env python3
"""LivePulse V12.7: offline scene-layer, sprite and HTTP regression.
Uses isolated temporary HOME and private port; never contacts TikTok.
Requires Python stdlib and Node.js only, runs in Termux without Pillow.
"""
from pathlib import Path
import base64,hashlib,json,os,re,shutil,socket,subprocess,sys,tempfile,time,urllib.error,urllib.request,struct

ROOT=Path(__file__).resolve().parent
ASSETDIR=ROOT/'livepulse_visual'
NAMES=[
 'v127_dragon_chat_aura.png','v127_dragon_creator_aura.png',
 'v127_boss_sigil_1.png','v127_boss_sigil_2.png','v127_boss_sigil_3.png',
 'v127_tower_chat_aura.png','v127_tower_creator_aura.png',
 'v127_depth_rays.png','v127_ground_mist.png',
 'v127_impact_chat.png','v127_impact_creator.png',
 'v127_shield_aura.png','v127_victory_burst.png',
]
results=[]
def check(name,ok,details=''):
 results.append((name,bool(ok),str(details)))
 print(('OK' if ok else 'FALHOU')+' | '+name+(' | '+str(details)[:150] if details and not ok else ''),flush=True)

def get(base,route,headers=None,timeout=3):
 req=urllib.request.Request(base+route,headers=headers or {})
 try:
  with urllib.request.urlopen(req,timeout=timeout) as res:return res.status,res.read(),res.headers
 except urllib.error.HTTPError as err:return err.code,err.read(),err.headers

def wait_online(base,proc):
 for _ in range(75):
  if proc.poll() is not None:break
  try:
   if get(base,'/health',timeout=.3)[0]==200:return True
  except Exception:pass
  time.sleep(.09)
 return False

print('=== V12.7 — Teste visual e funcional OFFLINE ===',flush=True)
try:
 code=(ROOT/'batalha.js').read_text('utf8')
 check('Motor de batalha mantido', all(x in code for x in ['function v115Cinematic','function v126SpriteLoop','function v70TowerStates','function v127Cinematic']))
 check('HTML em camadas',all(code.count(x)==1 for x in ['id="v127depth"','id="v127flash"']))
 check('Chefao com fases 1, 2 e 3',all(('v127_boss_sigil_'+str(i)+'.png') in code for i in (1,2,3)) and 'dataset.v127Phase' in code)
 check('Auras independentes dos dragoes',all(('v127_dragon_'+s+'_aura.png') in code for s in ('chat','creator')))
 check('Escudo e estado critico das torres',"node.classList.toggle('v127-shield'" in code and "node.classList.toggle('v127-critical'" in code)
 check('Eventos visuais integrados ao combate','v127Cinematic(type,data);' in code and 'v127Visual.events++' in code)
 check('Modos de desempenho preservados',all(s in code for s in ('v60-economico','v60-equilibrado','v60-cinematografico','prefers-reduced-motion')))
 check('Painel administrativo preservado','id="v124dashboard"' in code and "u.pathname==='/painel'" in code)
 check('TikTok simulado preservado','--sim-tiktok' in code and 'tiktok_bridge_v125' in code)
 check('DOM de arena original presente',all(x in code for x in ('id="gchat"','id="gcreator"','id="bossSprite"','id="tchat"','id="tcreator"')))
 check('Versao de diagnostico atualizada',("version:'12.9'" in code or "version:'12.9.2'" in code or "version:'12.9.3'" in code or "version:'12.9.4'" in code) and ('version:"12.9"' in code or 'version:"12.9.2"' in code or 'version:"12.9.3"' in code or 'version:"12.9.4"' in code))
 check('JavaScript do servidor valido',subprocess.run(['node','--check',str(ROOT/'batalha.js')],capture_output=True).returncode==0)
 browser=re.search(r'<script>(.*?)</script>',code,re.S)
 if not browser:raise RuntimeError('script nao localizado')
 b=browser.group(1).replace('${JSON.stringify(names)}','["Bloco"]').replace('${JSON.stringify(namesB)}','["Coroa"]').replace('${JSON.stringify(effects)}','[1]')
 with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf8',delete=False) as temp:
  temp.write(b);tmpfile=temp.name
 try:check('JavaScript do overlay valido',subprocess.run(['node','--check',tmpfile],capture_output=True).returncode==0)
 finally:Path(tmpfile).unlink(missing_ok=True)
 # Independent images: PNG color type 6 == transparent-capable RGBA.
 for name in NAMES:
  f=ASSETDIR/name
  try:
   data=f.read_bytes();valid=data[:8]==b'\x89PNG\r\n\x1a\n' and data[12:16]==b'IHDR'
   if valid:
    w,h,depth,typ=struct.unpack('>IIBB',data[16:26]);valid=(w>=256 and h>=200 and depth==8 and typ==6 and len(data)<350_000)
  except Exception:valid=False
  check('PNG RGBA independente '+name,valid)
 # Structural test: CSS selector layer has pointer-events:none, not blocking game controls.
 css=code.split('/* LivePulse V12.7 — independent cinematic passes',1)[1].split('</style>',1)[0]
 check('Camadas nao bloqueiam toques','pointer-events:none!important' in css and '#v127depth' in css and '#v127flash' in css)
 check('Economia desliga efeitos V12.7','v60-economico .arena .field #v127depth' in css and 'v60-economico .arena .field #v127flash' in css)
 check('Movimento reduzido respeitado','@media(prefers-reduced-motion:reduce)' in css and 'animation:none!important' in css)
 check('Sem loop visual adicional', 'setInterval(v127Cinematic' not in code and 'requestAnimationFrame(v127Cinematic' not in code)
except Exception as exc:
 check('Analise estatica completa',False,repr(exc))

# Run local DEMO on a random port, without touching installed saved state.
with tempfile.TemporaryDirectory(prefix='livepulse_visual_v127_') as tempdir:
 t=Path(tempdir)
 try:
  with socket.socket() as sock:
   sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  source=(ROOT/'batalha.js').read_text('utf8')
  original="server.listen(3001,'127.0.0.1'"
  if source.count(original)!=1:raise RuntimeError('Marcador da porta isolada ausente')
  (t/'batalha.js').write_text(source.replace(original,f"server.listen({port},'127.0.0.1'",1))
  for name in ('tiktok_bridge_v125.js','tiktok_sim_v125.js','economia_v1294.js'):
   if (ROOT/name).is_file():shutil.copy2(ROOT/name,t/name)
  (t/'livepulse_visual').mkdir()
  for name in NAMES:shutil.copy2(ASSETDIR/name,t/'livepulse_visual'/name)
  for f in ASSETDIR.glob('v112_dragon_*_idle_0.png'):
   shutil.copy2(f,t/'livepulse_visual'/f.name)
  proc=subprocess.Popen(['node','batalha.js','--demo'],cwd=t,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  try:
   base=f'http://127.0.0.1:{port}'
   online=wait_online(base,proc);check('Servidor DEMO isolado inicia',online)
   if online:
    status,data,_=get(base,'/overlay');page=data.decode('utf8','replace')
    check('Overlay V12.7 entregue',status==200 and 'id="v127depth"' in page and 'function v127Cinematic(' in page)
    status,data,_=get(base,'/painel')
    check('Painel administrativo continua acessivel',status==200 and b'v124dashboard' in data)
    status,data,_=get(base,'/health');health=json.loads(data)
    check('Health V12.7 ativo',status==200 and health.get('version') in ('12.7','12.8','12.9','12.9.2','12.9.3','12.9.4') and health.get('performance',{}).get('version') in ('12.7','12.8','12.9','12.9.2','12.9.3','12.9.4'))
    for name in NAMES:
     status,data,headers=get(base,'/visual_assets/'+name)
     ok=(status==200 and data[:8]==b'\x89PNG\r\n\x1a\n' and len(data)>1500)
     check('HTTP recurso '+name,ok)
    status,data,headers=get(base,'/visual_assets/v127_boss_sigil_3.png')
    etag=headers.get('ETag','')
    status304,_,_=get(base,'/visual_assets/v127_boss_sigil_3.png',{'If-None-Match':etag})
    check('Cache visual ETag funciona',bool(etag) and status304==304)
    time.sleep(7.0)
    status,data,_=get(base,'/state');state=json.loads(data)
    check('Rodada DEMO segue ativa',status==200 and state['game'].get('phase')=='playing')
    check('Pontuacao DEMO alimentada',state['game'].get('chat',0)!=120 or state['game'].get('creator',0)!=120)
  finally:
   proc.terminate()
   try:proc.wait(timeout=4)
   except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=4)
 except Exception as exc:check('Integracao HTTP isolada',False,repr(exc))

passed=sum(bool(x[1]) for x in results)
report={'version':'12.7','scope':'Arte independente, integridade PNG, sintaxe Node, HTTP DEMO offline (sem TikTok real; sem teste visual fisico Android)','passed':passed,'total':len(results),'checks':[{'name':n,'ok':b,'detail':d} for n,b,d in results]}
(ROOT/'relatorio_visual_v127.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(f'RESULTADO V12.7 VISUAL: {passed}/{len(results)} testes aprovados',flush=True)
sys.exit(0 if passed==len(results) else 1)
