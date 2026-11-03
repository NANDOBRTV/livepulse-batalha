#!/usr/bin/env python3
"""Regressao do Level Design LivePulse - somente Node.js + Python stdlib, SEM LIVE real."""
from pathlib import Path
import json,os,shutil,socket,subprocess,tempfile,time,urllib.request,sys
ROOT=Path(__file__).resolve().parent
ok=0;bad=0

def test(name,condition):
 global ok,bad
 if condition:ok+=1;print('OK |',name,flush=True)
 else:bad+=1;print('FALHOU |',name,flush=True)

def get(base,path):
 with urllib.request.urlopen(base+path,timeout=4) as r:return r.status,json.loads(r.read())

def post(base,path,key,action):
 req=urllib.request.Request(base+path,data=json.dumps({'action':action}).encode(),headers={'X-LivePulse-Key':key,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=4) as r:return r.status

def main():
 source=(ROOT/'batalha.js').read_text()
 test('Arquivos de economia e sprites existentes nao removidos',all(x in source for x in ['economia_v1294','v129_tower_','v129_boss_','tiktok_bridge_v125']))
 test('Guia claro para novos espectadores',all(x in source for x in ['ldGuide','ldProgress','!escudo','!foco']))
 test('SSE existente preservado',"u.pathname==='/events'" in source and 'clients.add(res)' in source)
 test('CSS nao estica o PNG do cenario',"background-size:100% 100%,contain!important" in source)
 test('Alvo telegrafado por evento SSE',all(x in source for x in ['combatTelegraph:','ld-targeted','levelDesign.RULES.telegraphMs']))
 test('Recuperacao de torre com cooldown',all(x in source for x in ['downUntil','combatTowerRestored','levelDesign.RULES.towerRebuildMs']))
 test('Um chefao automatico por rodada',"combat.roundSummoned===game.round" in source)
 test('Valores dos presentes inalterados',"chatPoints:[1,10,30,-20,25,50,100]" in source and "creatorPoints:[1,10,30,-20,25,50,100]" in source)
 test('Script Node.js valido',subprocess.run(['node','--check',str(ROOT/'batalha.js')],capture_output=True).returncode==0)
 with tempfile.TemporaryDirectory(prefix='livepulse_leveldesign_') as td:
  tmp=Path(td);needed=['batalha.js','economia_v1294.js']
  for f in needed:shutil.copy2(ROOT/f,tmp/f)
  for folder in ['livepulse_visual','batalha_assets']:
   if (ROOT/folder).is_dir(): (tmp/folder).symlink_to(ROOT/folder,target_is_directory=True)
  with socket.socket() as ss:ss.bind(('127.0.0.1',0));port=ss.getsockname()[1]
  src=(tmp/'batalha.js').read_text().replace("server.listen(3001,'127.0.0.1'",f"server.listen({port},'127.0.0.1'",1)
  (tmp/'batalha.js').write_text(src)
  base=f'http://127.0.0.1:{port}'
  p=subprocess.Popen(['node','batalha.js','--demo'],cwd=tmp,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  try:
   for _ in range(60):
    try:get(base,'/health');break
    except Exception:time.sleep(.1)
   else:raise RuntimeError('Servidor isolado nao inicia')
   status,health=get(base,'/health');test('Servidor inicia offline',status==200 and health['ok'])
   _,state=get(base,'/state');test('Estado e pacing valido',state['runtime']['levelDesign']['maxAutomaticBossesPerRound']==1)
   test('Meta da partida preservada',state['config']['goal']==500)
   with urllib.request.urlopen(base+'/overlay',timeout=4) as r:html=r.read().decode()
   test('DOM inclui faixa acessivel e presentes',all(x in html for x in ['id="ldGuide"','id="ldEncounter"','id="gchat"','id="gcreator"']))
   with urllib.request.urlopen(base+'/events',timeout=4) as r:test('SSE responde',r.status==200 and r.read(5)==b'data:')
   with urllib.request.urlopen(base+'/painel',timeout=4) as r:test('Painel preservado',r.status==200)
   key=(tmp/'batalha_admin_v55.key').read_text().strip()
   test('Comando de boss autorizado',post(base,'/admin',key,'boss')==200)
   _,st=get(base,'/state');test('Boss invocado fase 1',st['runtime']['combat']['active'] and st['runtime']['combat']['stage']==1)
   time.sleep(7.2)
   _,st=get(base,'/state');c=st['runtime']['combat']
   test('Alvo escolhido antes do ataque',c['target'] in ('chat','creator'))
   for _ in range(16):
    post(base,'/admin',key,'combatTestAttack');_,st=get(base,'/state');towers=st['runtime']['combat']['towers']
    if any(x['hp']==0 for x in towers.values()):break
   down=[k for k,x in towers.items() if x['hp']==0]
   test('Torre nao ressuscita instantaneamente',len(down)==1 and towers[down[0]].get('downUntil',0)>time.time()*1000)
   if down:
    t=max(0,(towers[down[0]]['downUntil']-time.time()*1000)/1000)+1.5;time.sleep(t)
    _,st=get(base,'/state');tower=st['runtime']['combat']['towers'][down[0]]
    test('Torre recupera apos recarga',tower['hp']==tower['maxHp'] and not tower.get('downUntil'))
  finally:
   p.terminate();p.wait(timeout=6)
 print('LEVEL DESIGN:',ok,'OK',bad,'FALHOU');return 0 if bad==0 else 1
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:print('ERRO:',repr(e));sys.exit(2)
