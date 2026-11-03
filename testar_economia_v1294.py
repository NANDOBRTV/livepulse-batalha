#!/usr/bin/env python3
"""LivePulse V12.9.4 — offline safety and end-to-end simulated economy checks."""
from pathlib import Path
import json, os, shutil, socket, subprocess, sys, tempfile, time, urllib.request
ROOT=Path(__file__).resolve().parent
passed=0;total=0

def check(name,ok):
 global passed,total
 total+=1
 if ok:passed+=1;print('OK | '+name,flush=True)
 else:print('FALHOU | '+name,flush=True)

unit=subprocess.run(['node',str(ROOT/'testar_economia_v1294.js')],cwd=ROOT,capture_output=True,text=True,timeout=20)
print(unit.stdout,flush=True)
check('48 testes unitarios da economia',unit.returncode==0 and '48/48 SUCESSO' in unit.stdout)
try:
 with tempfile.TemporaryDirectory(prefix='lp1294_offline_') as t:
  root=Path(t)
  (root/'batalha.js').write_bytes((ROOT/'batalha.js').read_bytes())
  shutil.copy2(ROOT/'economia_v1294.js',root/'economia_v1294.js')
  cfg={'goal':500,'duration':240,'start':120,'chatVote':1,'creatorVote':1,'followPoints':2,'botSpeed':2000,'sound':False,'bestOf':3,
       'chatNames':['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro'],
       'creatorNames':['Bloco','TikTok','Cookies','Rosquinha','Coroa','Corações Azul','Coroa Real'],
       'chatPoints':[1,10,30,-20,25,50,100], 'creatorPoints':[1,10,30,-20,25,50,100]}
  (root/'batalha_config.json').write_text(json.dumps(cfg),encoding='utf8')
  (root/'batalha_gift_ids.json').write_text(json.dumps({'4242':{'team':'creator','idx':0}}))
  with socket.socket() as s:
   s.bind(('127.0.0.1',0));port=s.getsockname()[1]
  src=(root/'batalha.js').read_text()
  assert "server.listen(3001,'127.0.0.1'" in src
  src=src.replace("server.listen(3001,'127.0.0.1'",f"server.listen({port},'127.0.0.1'",1)
  # Private test-only event injection. This is NOT present in the shipped game.
  injection=r'''
setTimeout(()=>{
 try{
 const history=[];function record(tag){history.push({tag,chat:game.chat,creator:game.creator})}
 record('start');
 event('chat','Alice','!chat');record('vote');
 event('chat','Alice','!chat');record('spam_vote');
 event('like','Alice','Curtir',25);record('like');
 event('like','Alice','Curtir',25);record('spam_like');
 event('share','Alice','Compartilhou');record('share');
 event('share','Alice','Compartilhou');record('spam_share');
 event('gift','Alice','Dinheiro',100,'chat',6);record('gift_huge');
 special('surprise');event('gift','Alice','Dinheiro',100,'chat',6);record('gift_doubled');
 event('gift','Bob','Rosquinha',1,'creator',3);record('gift_rosquinha');
 const ambiguous=giftMatch('Bloco',null), explicit=giftMatch('Bloco','4242'), unique=giftMatch('TikTok',null);
 if(!ambiguous)economy.unmapped('Bloco',null,'nome ambiguo');
 event('gift','Outro','PresenteNaoMapeado',7);record('gift_unknown');
 event('follow','Alice','Começou a seguir');record('follow');
 const result={history,ambiguous,explicit,unique,config:cfg,economy:economy.snapshot(cfg),healthPhase:game.phase,
  lastGift:game.feed.find(x=>x.message==='PresenteNaoMapeado'),ranking:game.ranking,stats:stats.likes};
 require('fs').writeFileSync('v1294_event_results.json',JSON.stringify(result));
 }catch(e){require('fs').writeFileSync('v1294_event_error.txt',String(e.stack||e))}
},650);
'''
  (root/'batalha.js').write_text(src+injection)
  env={**os.environ,'LIVEPULSE_SIM_SPEED':'1'}
  p=subprocess.Popen(['node','batalha.js'],cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  try:
   base=f'http://127.0.0.1:{port}'
   ready=False
   for i in range(40):
    try:
     with urllib.request.urlopen(base+'/health',timeout=.5) as r:
      h=json.loads(r.read());ready=True;break
    except Exception:time.sleep(.15)
   check('Servidor offline isolado inicia',ready)
   if not ready:raise RuntimeError('servidor nao iniciou')
   def get(route):
    with urllib.request.urlopen(base+route,timeout=3) as r:return r.status,json.loads(r.read()),dict(r.headers)
   check('Health reporta versao 12.9.4',h.get('version')=='12.9.4')
   check('Health nao inicia conexao TikTok',h.get('mode')=='local')
   check('Health tem diagnostico de economia',h.get('economy',{}).get('maxEventPoints')==150)
   status,state,headers=get('/state')
   check('API state funciona sem cache',status==200 and 'no-store' in headers.get('Cache-Control',''))
   check('Rosquinha CHAT ofensiva -20',state['config']['chatPoints'][3]==-20)
   check('Rosquinha CRIADOR ofensiva -20',state['config']['creatorPoints'][3]==-20)
   check('Cookies mantem +30',state['config']['creatorPoints'][2]==30)
   check('Config antiga ganha limites seguros',state['config']['maxEventPoints']==150 and state['config']['maxCombinedMultiplier']==3)
   check('Configuracao anterior nao e sobrescrita',json.loads((root/'batalha_config.json').read_text())['chatPoints'][3]==-20)
   req=urllib.request.Request(base+'/config',method='POST',data=b'{}')
   try:urllib.request.urlopen(req,timeout=3);unauthorized=False
   except urllib.error.HTTPError as e:unauthorized=e.code==403
   check('API de escrita continua protegida',unauthorized)
   check('Painel administrativo continua acessivel',urllib.request.urlopen(base+'/painel',timeout=3).status==200)
   resultfile=root/'v1294_event_results.json'
   for i in range(60):
    if resultfile.exists() or (root/'v1294_event_error.txt').exists():break
    time.sleep(.12)
   if (root/'v1294_event_error.txt').exists():raise RuntimeError((root/'v1294_event_error.txt').read_text())
   if not resultfile.exists():raise RuntimeError('resultado injetado nao gerado')
   r=json.loads(resultfile.read_text());hist={x['tag']:x for x in r['history']}
   delta=lambda start,end,team:hist[end][team]-hist[start][team]
   check('Comando chat concede apoio gratuito',delta('start','vote','chat')==1)
   check('Spam de comando nao soma repetidamente',delta('vote','spam_vote','chat')==0)
   check('Curtidas apoiam time escolhido',delta('spam_vote','like','chat')==2)
   check('Spam de curtidas nao soma repetidamente',delta('like','spam_like','chat')==0)
   check('Compartilhamento apoia time escolhido',delta('spam_like','share','chat')==3)
   check('Compartilhamentos em rajada sao limitados',delta('share','spam_share','chat')==0)
   check('Presente enorme fica abaixo de 30 por cento da meta',delta('spam_share','gift_huge','chat')==150)
   check('Pontos em dobro nao contornam o teto',delta('gift_huge','gift_doubled','chat')==150)
   check('Rosquinha CRIADOR nao soma no proprio time',delta('gift_doubled','gift_rosquinha','creator')==0)
   check('Rosquinha CRIADOR retira pontos do CHAT',delta('gift_doubled','gift_rosquinha','chat')==-40)
   check('Rosquinha nao incrementa o placar do CRIADOR',delta('gift_doubled','gift_rosquinha','creator')==0)
   check('Bloco ambiguo permanece sem equipe',r['ambiguous'] is None)
   check('ID explicitamente mapeado prioriza CRIADOR',r['explicit']['team']=='creator')
   check('Nome TikTok exclusivo e reconhecido',r['unique']['team']=='creator')
   check('Presente nao reconhecido nao pontua time',delta('gift_rosquinha','gift_unknown','creator')==0 and delta('gift_rosquinha','gift_unknown','chat')==0)
   check('Presente nao reconhecido ainda consta no historico',r['lastGift']['pts']==0 and r['lastGift']['team'] is None)
   check('Alertas de mapeamento sao armazenados',r['economy']['unmappedTotal']>=1)
   check('Indicador de pontos limitados contabiliza eventos',r['economy']['scoreCapped']>=2)
   check('Pontuacao principal permanece em fase de jogo',r['healthPhase']=='playing')
   check('Somente Rosquinha reduz pontos adversarios',all(hist['gift_rosquinha'][t]>=0 for t in ['chat','creator']))
  finally:
   p.terminate()
   try:p.wait(timeout=4)
   except subprocess.TimeoutExpired:p.kill();p.wait()
except Exception as exc:
 print('ERRO INTEGRACAO:',repr(exc),flush=True)
 total+=1
print(f'RESULTADO ECONOMIA V12.9.4: {passed}/{total} verificacoes aprovadas',flush=True)
sys.exit(0 if passed==total else 1)
